import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    id: 'cat-001',
    name: 'Bohri Ridha & Burka Tailoring',
    slug: 'bohri-ridha-burka-tailoring',
    description: 'Custom stitching of traditional Bohri Ridha, Burka, and related garments',
    displayOrder: 1,
  },
  {
    id: 'cat-002',
    name: 'Tuition & Classes',
    slug: 'tuition-classes',
    description: 'Academic tuitions, Quran classes, language, music, arts and crafts',
    displayOrder: 2,
  },
  {
    id: 'cat-003',
    name: 'Beauty & Mehandi',
    slug: 'beauty-mehandi',
    description: 'Beauty services, bridal makeup, Mehandi (henna), skincare, haircare',
    displayOrder: 3,
  },
  {
    id: 'cat-004',
    name: 'Jewellery & Accessories',
    slug: 'jewellery-accessories',
    description: 'Handmade or resale jewellery, Bohri traditional accessories, bags',
    displayOrder: 4,
  },
  {
    id: 'cat-005',
    name: 'Others',
    slug: 'others',
    description: 'Any other community-approved services not covered in the above categories',
    displayOrder: 5,
  },
];

const subCategories = [
  {
    id: 'cat-006',
    parentId: 'cat-002',
    name: 'Academic Tuitions',
    slug: 'academic-tuitions',
    displayOrder: 1,
  },
  {
    id: 'cat-007',
    parentId: 'cat-002',
    name: 'Quran Classes',
    slug: 'quran-classes',
    displayOrder: 2,
  },
  {
    id: 'cat-008',
    parentId: 'cat-003',
    name: 'Bridal Makeup',
    slug: 'bridal-makeup',
    displayOrder: 1,
  },
  {
    id: 'cat-009',
    parentId: 'cat-003',
    name: 'Mehandi / Henna',
    slug: 'mehandi-henna',
    displayOrder: 2,
  },
  {
    id: 'cat-010',
    parentId: 'cat-003',
    name: 'Skincare & Haircare',
    slug: 'skincare-haircare',
    displayOrder: 3,
  },
  {
    id: 'cat-011',
    parentId: 'cat-004',
    name: 'Handmade Jewellery',
    slug: 'handmade-jewellery',
    displayOrder: 1,
  },
  {
    id: 'cat-012',
    parentId: 'cat-004',
    name: 'Traditional Accessories',
    slug: 'traditional-accessories',
    displayOrder: 2,
  },
];

async function main() {
  console.log('🌱 Seeding categories...');

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
  }

  for (const sub of subCategories) {
    await prisma.category.upsert({
      where: { id: sub.id },
      update: { name: sub.name },
      create: sub,
    });
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
