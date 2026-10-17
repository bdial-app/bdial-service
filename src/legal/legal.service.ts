import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  AuditLog,
  LegalAcceptance,
  LegalDocument,
  LegalDocumentVersion,
  Provider,
} from '../entities';
import { LEGAL_DEFAULTS, LegalRequiredFor } from './legal-defaults';

export interface LegalDocumentSummary {
  slug: string;
  title: string;
  summary: string;
  requiredFor: LegalRequiredFor;
  version: number;
  publishedAt: Date;
}

export interface LegalDocumentFull extends LegalDocumentSummary {
  content: string;
  changeNote: string | null;
}

export interface PendingLegalDocument extends LegalDocumentSummary {
  /** They accepted an earlier version: show "we've updated…" rather than "please accept". */
  updated: boolean;
  changeNote: string | null;
}

export interface MyLegalStatus {
  isOwner: boolean;
  pending: PendingLegalDocument[];
  accepted: { slug: string; version: number; acceptedAt: Date }[];
}

export interface AcceptMeta {
  method: 'signin_prompt' | 'business_onboarding';
  platform?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

const MAX_CONTENT = 200_000;

/**
 * Legal documents and who has accepted them. Each document has numbered,
 * published versions; the newest is what people read. A version published
 * with "ask everyone to accept again" makes everyone it applies to accept it
 * on their next visit; others are accepted quietly as they come.
 */
@Injectable()
export class LegalService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LegalService.name);

  constructor(
    @InjectRepository(LegalDocument)
    private readonly docs: Repository<LegalDocument>,
    @InjectRepository(LegalDocumentVersion)
    private readonly versions: Repository<LegalDocumentVersion>,
    @InjectRepository(LegalAcceptance)
    private readonly acceptances: Repository<LegalAcceptance>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(AuditLog)
    private readonly audit: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const created = await this.seedDefaults();
      if (created.length)
        this.logger.log(`Legal documents added: ${created.join(', ')}`);
    } catch (err) {
      this.logger.warn(
        `Could not add legal documents: ${(err as Error).message}`,
      );
    }
  }

  /** Adds any built-in document that doesn't exist yet, as its version 1. */
  async seedDefaults(): Promise<string[]> {
    const existing = await this.docs.find({ select: { slug: true } });
    const have = new Set(existing.map((d) => d.slug));
    const created: string[] = [];
    for (const d of LEGAL_DEFAULTS) {
      if (have.has(d.slug)) continue;
      await this.dataSource.transaction(async (m) => {
        const inserted = await m
          .createQueryBuilder()
          .insert()
          .into(LegalDocument)
          .values({
            slug: d.slug,
            title: d.title,
            summary: d.summary,
            requiredFor: d.requiredFor,
            sortOrder: d.sortOrder,
          })
          .orIgnore()
          .returning(['id'])
          .execute();
        const id = (inserted.raw as { id: string }[])[0]?.id;
        if (!id) return; // another instance added it first
        await m.insert(LegalDocumentVersion, {
          documentId: id,
          version: 1,
          title: d.title,
          content: d.content,
          changeNote: 'First version',
          requiresAcceptance: d.requiredFor !== 'none',
          publishedBy: null,
        });
        created.push(d.slug);
      });
    }
    return created;
  }

  // ── Reading ──────────────────────────────────────────────────────────

  /** Newest version of each document, keyed by document id. */
  private async latestVersions(
    documentIds: string[],
  ): Promise<Map<string, LegalDocumentVersion>> {
    if (!documentIds.length) return new Map();
    const rows = await this.versions
      .createQueryBuilder('v')
      .distinctOn(['v.documentId'])
      .where('v.documentId IN (:...ids)', { ids: documentIds })
      .orderBy('v.documentId')
      .addOrderBy('v.version', 'DESC')
      .getMany();
    return new Map(rows.map((v) => [v.documentId, v]));
  }

  /** Every published document, for the apps' Legal menu. */
  async publicList(): Promise<LegalDocumentSummary[]> {
    const docs = await this.docs.find({
      order: { sortOrder: 'ASC', title: 'ASC' },
    });
    const latest = await this.latestVersions(docs.map((d) => d.id));
    return docs.flatMap((d) => {
      const v = latest.get(d.id);
      return v ? [this.summaryOf(d, v)] : [];
    });
  }

  /** One document's current text. */
  async publicGet(slug: string): Promise<LegalDocumentFull> {
    const doc = await this.docs.findOne({ where: { slug } });
    if (!doc) throw new NotFoundException('Document not found');
    const v = (await this.latestVersions([doc.id])).get(doc.id);
    if (!v) throw new NotFoundException('Document not published');
    return {
      ...this.summaryOf(doc, v),
      content: v.content,
      changeNote: v.changeNote,
    };
  }

  private summaryOf(
    d: LegalDocument,
    v: LegalDocumentVersion,
  ): LegalDocumentSummary {
    return {
      slug: d.slug,
      title: v.title,
      summary: d.summary,
      requiredFor: d.requiredFor,
      version: v.version,
      publishedAt: v.publishedAt,
    };
  }

  private async isOwner(userId: string): Promise<boolean> {
    return (await this.providers.count({ where: { userId } })) > 0;
  }

  /**
   * What this person still has to accept: every document that applies to
   * them (business ones only for owners) where they haven't accepted the
   * newest version that asked for acceptance.
   */
  async myStatus(userId: string): Promise<MyLegalStatus> {
    const isOwner = await this.isOwner(userId);
    const applies: LegalRequiredFor[] = isOwner
      ? ['everyone', 'business']
      : ['everyone'];
    const docs = await this.docs.find({
      where: { requiredFor: In(applies) },
      order: { sortOrder: 'ASC' },
    });
    const accepted = await this.acceptances
      .createQueryBuilder('a')
      .select('a.slug', 'slug')
      .addSelect('MAX(a.version)', 'version')
      .addSelect('MAX(a.acceptedAt)', 'acceptedAt')
      .where('a.userId = :userId', { userId })
      .groupBy('a.slug')
      .getRawMany<{ slug: string; version: number; acceptedAt: Date }>();
    const acceptedBySlug = new Map(
      accepted.map((a) => [a.slug, Number(a.version)]),
    );
    if (!docs.length) {
      return {
        isOwner,
        pending: [],
        accepted: accepted.map((a) => ({ ...a, version: Number(a.version) })),
      };
    }

    const ids = docs.map((d) => d.id);
    const latest = await this.latestVersions(ids);
    // The newest version of each document that asked for acceptance.
    const mustRows = await this.versions
      .createQueryBuilder('v')
      .select('v.documentId', 'documentId')
      .addSelect('MAX(v.version)', 'version')
      .where('v.documentId IN (:...ids)', { ids })
      .andWhere('v.requiresAcceptance = true')
      .groupBy('v.documentId')
      .getRawMany<{ documentId: string; version: number }>();
    const mustBy = new Map(
      mustRows.map((r) => [r.documentId, Number(r.version)]),
    );

    const pending: PendingLegalDocument[] = [];
    for (const d of docs) {
      const v = latest.get(d.id);
      if (!v) continue;
      const must = mustBy.get(d.id) ?? 1;
      const had = acceptedBySlug.get(d.slug) ?? 0;
      if (had >= must) continue;
      pending.push({
        ...this.summaryOf(d, v),
        updated: had > 0,
        changeNote: v.changeNote,
      });
    }
    return {
      isOwner,
      pending,
      accepted: accepted.map((a) => ({ ...a, version: Number(a.version) })),
    };
  }

  /**
   * Records that they ticked "I agree" to these documents, at the versions
   * they were shown. An older version than the current one is still
   * recorded (it's what they saw); they'll be asked about the newer one.
   */
  async accept(
    userId: string,
    items: { slug: string; version: number }[],
    meta: AcceptMeta,
  ): Promise<MyLegalStatus> {
    const slugs = [...new Set(items.map((i) => i.slug))];
    const docs = await this.docs.find({ where: { slug: In(slugs) } });
    if (docs.length !== slugs.length)
      throw new BadRequestException('Unknown document');
    const bySlug = new Map(docs.map((d) => [d.slug, d]));
    const rows: Partial<LegalAcceptance>[] = [];
    for (const item of items) {
      const doc = bySlug.get(item.slug)!;
      const v = await this.versions.findOne({
        where: { documentId: doc.id, version: item.version },
      });
      if (!v)
        throw new BadRequestException(
          `No version ${item.version} of ${item.slug}`,
        );
      rows.push({
        userId,
        documentId: doc.id,
        versionId: v.id,
        slug: doc.slug,
        version: v.version,
        method: meta.method,
        platform: meta.platform?.slice(0, 20) ?? null,
        ip: meta.ip?.slice(0, 64) ?? null,
        userAgent: meta.userAgent?.slice(0, 300) ?? null,
      });
    }
    if (rows.length) {
      await this.acceptances
        .createQueryBuilder()
        .insert()
        .into(LegalAcceptance)
        .values(rows)
        .orIgnore()
        .execute();
    }
    return this.myStatus(userId);
  }

  // ── Admin (super admin) ──────────────────────────────────────────────

  async adminList() {
    const docs = await this.docs.find({
      order: { sortOrder: 'ASC', title: 'ASC' },
    });
    const latest = await this.latestVersions(docs.map((d) => d.id));
    const counts = docs.length
      ? await this.acceptances
          .createQueryBuilder('a')
          .select('a.documentId', 'documentId')
          .addSelect('a.version', 'version')
          .addSelect('COUNT(DISTINCT a.userId)', 'count')
          .where('a.documentId IN (:...ids)', { ids: docs.map((d) => d.id) })
          .groupBy('a.documentId')
          .addGroupBy('a.version')
          .getRawMany<{ documentId: string; version: number; count: string }>()
      : [];
    return docs.map((d) => {
      const v = latest.get(d.id);
      const current = counts.find(
        (c) => c.documentId === d.id && Number(c.version) === v?.version,
      );
      return {
        slug: d.slug,
        title: v?.title ?? d.title,
        summary: d.summary,
        requiredFor: d.requiredFor,
        version: v?.version ?? 0,
        publishedAt: v?.publishedAt ?? null,
        hasDraft: d.draftContent !== null,
        draftUpdatedAt: d.draftUpdatedAt,
        acceptedCurrent: Number(current?.count ?? 0),
      };
    });
  }

  private async docOr404(slug: string): Promise<LegalDocument> {
    const doc = await this.docs.findOne({ where: { slug } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async adminGet(slug: string) {
    const doc = await this.docOr404(slug);
    const versions = await this.versions.find({
      where: { documentId: doc.id },
      order: { version: 'DESC' },
    });
    const counts = await this.acceptances
      .createQueryBuilder('a')
      .select('a.version', 'version')
      .addSelect('COUNT(DISTINCT a.userId)', 'count')
      .where('a.documentId = :id', { id: doc.id })
      .groupBy('a.version')
      .getRawMany<{ version: number; count: string }>();
    const countBy = new Map(
      counts.map((c) => [Number(c.version), Number(c.count)]),
    );
    const current = versions[0];
    return {
      slug: doc.slug,
      title: current?.title ?? doc.title,
      summary: doc.summary,
      requiredFor: doc.requiredFor,
      draft:
        doc.draftContent !== null
          ? {
              title: doc.draftTitle ?? current?.title ?? doc.title,
              summary: doc.draftSummary ?? doc.summary,
              content: doc.draftContent,
              updatedAt: doc.draftUpdatedAt,
            }
          : null,
      versions: versions.map((v) => ({
        version: v.version,
        title: v.title,
        content: v.content,
        changeNote: v.changeNote,
        requiresAcceptance: v.requiresAcceptance,
        publishedAt: v.publishedAt,
        publishedBy: v.publishedBy,
        accepted: countBy.get(v.version) ?? 0,
      })),
    };
  }

  async saveDraft(
    slug: string,
    adminId: string,
    body: { title: string; summary: string; content: string },
  ) {
    const doc = await this.docOr404(slug);
    this.checkText(body);
    await this.docs.update(
      { id: doc.id },
      {
        draftTitle: body.title.trim(),
        draftSummary: body.summary.trim(),
        draftContent: body.content,
        draftUpdatedAt: new Date(),
        draftUpdatedBy: adminId,
      },
    );
    return this.adminGet(slug);
  }

  async discardDraft(slug: string) {
    const doc = await this.docOr404(slug);
    await this.docs.update(
      { id: doc.id },
      {
        draftTitle: null,
        draftSummary: null,
        draftContent: null,
        draftUpdatedAt: null,
        draftUpdatedBy: null,
      },
    );
    return this.adminGet(slug);
  }

  /** Publishes the text as the next version and clears the draft. */
  async publish(
    slug: string,
    adminId: string,
    body: {
      title: string;
      summary: string;
      content: string;
      changeNote: string;
      requiresAcceptance: boolean;
      requiredFor: LegalRequiredFor;
    },
  ) {
    const doc = await this.docOr404(slug);
    this.checkText(body);
    const latest = (await this.latestVersions([doc.id])).get(doc.id);
    const next = (latest?.version ?? 0) + 1;
    await this.dataSource.transaction(async (m) => {
      await m.insert(LegalDocumentVersion, {
        documentId: doc.id,
        version: next,
        title: body.title.trim(),
        content: body.content,
        changeNote: body.changeNote.trim() || null,
        requiresAcceptance:
          body.requiredFor !== 'none' && body.requiresAcceptance,
        publishedBy: adminId,
      });
      await m.update(
        LegalDocument,
        { id: doc.id },
        {
          title: body.title.trim(),
          summary: body.summary.trim(),
          requiredFor: body.requiredFor,
          draftTitle: null,
          draftSummary: null,
          draftContent: null,
          draftUpdatedAt: null,
          draftUpdatedBy: null,
        },
      );
    });
    await this.audit.save(
      this.audit.create({
        adminId,
        action: 'publish_legal_document',
        entityType: 'legal_document',
        entityId: doc.id,
        previousState: latest
          ? { version: latest.version, requiredFor: doc.requiredFor }
          : null,
        newState: {
          version: next,
          requiredFor: body.requiredFor,
          requiresAcceptance: body.requiresAcceptance,
        },
        description: `Published ${body.title.trim()} v${next}${
          body.requiresAcceptance && body.requiredFor !== 'none'
            ? ' (everyone asked to accept again)'
            : ''
        }`,
      }),
    );
    return this.adminGet(slug);
  }

  private checkText(body: { title: string; content: string }) {
    if (!body.title?.trim()) throw new BadRequestException('Title is required');
    if (!body.content?.trim())
      throw new BadRequestException('The document is empty');
    if (body.content.length > MAX_CONTENT) {
      throw new BadRequestException('The document is too long');
    }
  }

  /** A person's acceptances, newest first, for the admin user and business pages. */
  async userAcceptances(userId: string) {
    const rows = await this.acceptances.find({
      where: { userId },
      order: { acceptedAt: 'DESC' },
      take: 50,
    });
    const status = await this.myStatus(userId);
    return {
      pending: status.pending.map((p) => ({
        slug: p.slug,
        title: p.title,
        version: p.version,
      })),
      acceptances: rows.map((r) => ({
        slug: r.slug,
        version: r.version,
        acceptedAt: r.acceptedAt,
        method: r.method,
        platform: r.platform,
      })),
    };
  }
}
