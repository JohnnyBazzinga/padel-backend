import { PrismaClient, Role, SkillLevel, User } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Admin
  const adminPassword = await argon2.hash('Admin123!@#');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@padelapp.pt' },
    update: {},
    create: {
      email: 'admin@padelapp.pt',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'Padel',
      phone: '+351912345678',
      city: 'Lisboa',
      skillLevel: SkillLevel.ADVANCED,
      isVerified: true,
      privacyAcceptedAt: new Date(),
      termsAcceptedAt: new Date(),
      roles: {
        create: { role: Role.ADMIN },
      },
    },
  });
  console.log('Admin created:', admin.email);

  // Create Club Owner
  const ownerPassword = await argon2.hash('Owner123!@#');
  const clubOwner = await prisma.user.upsert({
    where: { email: 'owner@padelclub.pt' },
    update: {},
    create: {
      email: 'owner@padelclub.pt',
      passwordHash: ownerPassword,
      firstName: 'Carlos',
      lastName: 'Silva',
      phone: '+351923456789',
      city: 'Lisboa',
      skillLevel: SkillLevel.ADVANCED,
      yearsPlaying: 10,
      isVerified: true,
      privacyAcceptedAt: new Date(),
      termsAcceptedAt: new Date(),
      roles: {
        create: { role: Role.CLUB_OWNER },
      },
    },
  });
  console.log('Club Owner created:', clubOwner.email);

  // Create Players
  const playerPassword = await argon2.hash('Player123!@#');
  const players: User[] = [];
  const playerData = [
    { email: 'joao@exemplo.pt', firstName: 'João', lastName: 'Santos', city: 'Lisboa', skillLevel: SkillLevel.INTERMEDIATE },
    { email: 'maria@exemplo.pt', firstName: 'Maria', lastName: 'Costa', city: 'Lisboa', skillLevel: SkillLevel.ADVANCED },
    { email: 'pedro@exemplo.pt', firstName: 'Pedro', lastName: 'Ferreira', city: 'Porto', skillLevel: SkillLevel.BEGINNER },
    { email: 'ana@exemplo.pt', firstName: 'Ana', lastName: 'Oliveira', city: 'Lisboa', skillLevel: SkillLevel.INTERMEDIATE },
    { email: 'miguel@exemplo.pt', firstName: 'Miguel', lastName: 'Rodrigues', city: 'Lisboa', skillLevel: SkillLevel.PROFESSIONAL },
    { email: 'sofia@exemplo.pt', firstName: 'Sofia', lastName: 'Martins', city: 'Porto', skillLevel: SkillLevel.INTERMEDIATE },
  ];

  for (const data of playerData) {
    const player = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash: playerPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        city: data.city,
        skillLevel: data.skillLevel,
        preferredHand: 'RIGHT',
        preferredSide: 'BOTH',
        yearsPlaying: Math.floor(Math.random() * 10) + 1,
        isVerified: true,
        privacyAcceptedAt: new Date(),
        termsAcceptedAt: new Date(),
        roles: {
          create: { role: Role.PLAYER },
        },
      },
    });
    players.push(player);
    console.log('Player created:', player.email);
  }

  // Create Clubs
  const club1 = await prisma.club.upsert({
    where: { slug: 'padel-lisboa-club' },
    update: {},
    create: {
      ownerId: clubOwner.id,
      name: 'Padel Lisboa Club',
      slug: 'padel-lisboa-club',
      description: 'O melhor clube de Padel de Lisboa. 6 campos cobertos, pro-shop e restaurante.',
      address: 'Av. da Liberdade, 100',
      city: 'Lisboa',
      postalCode: '1250-001',
      latitude: 38.7223,
      longitude: -9.1393,
      phone: '+351210123456',
      email: 'info@padellisboa.pt',
      website: 'https://padellisboa.pt',
      businessHours: JSON.stringify({
        monday: { open: '07:00', close: '23:00' },
        tuesday: { open: '07:00', close: '23:00' },
        wednesday: { open: '07:00', close: '23:00' },
        thursday: { open: '07:00', close: '23:00' },
        friday: { open: '07:00', close: '23:00' },
        saturday: { open: '08:00', close: '22:00' },
        sunday: { open: '08:00', close: '20:00' },
      }),
      hasParking: true,
      hasShowers: true,
      hasLockers: true,
      hasProShop: true,
      hasCafeteria: true,
      hasWifi: true,
      isVerified: true,
    },
  });
  console.log('Club created:', club1.name);

  const club2 = await prisma.club.upsert({
    where: { slug: 'padel-cascais' },
    update: {},
    create: {
      ownerId: clubOwner.id,
      name: 'Padel Cascais',
      slug: 'padel-cascais',
      description: 'Padel junto ao mar. Vista incrível e ambiente descontraído.',
      address: 'Rua das Flores, 50',
      city: 'Cascais',
      postalCode: '2750-001',
      latitude: 38.6979,
      longitude: -9.4215,
      phone: '+351214567890',
      email: 'info@padelcascais.pt',
      businessHours: JSON.stringify({
        monday: { open: '08:00', close: '22:00' },
        tuesday: { open: '08:00', close: '22:00' },
        wednesday: { open: '08:00', close: '22:00' },
        thursday: { open: '08:00', close: '22:00' },
        friday: { open: '08:00', close: '22:00' },
        saturday: { open: '09:00', close: '21:00' },
        sunday: { open: '09:00', close: '19:00' },
      }),
      hasParking: true,
      hasShowers: true,
      hasLockers: true,
      hasCafeteria: true,
      isVerified: true,
    },
  });
  console.log('Club created:', club2.name);

  // Create Courts for Club 1
  for (let i = 1; i <= 6; i++) {
    await prisma.court.upsert({
      where: { clubId_courtNumber: { clubId: club1.id, courtNumber: i } },
      update: {},
      create: {
        clubId: club1.id,
        name: `Campo ${i}`,
        courtNumber: i,
        surface: 'ARTIFICIAL_GRASS',
        isIndoor: i <= 4,
        hasLighting: true,
        hasCovering: i <= 4,
        pricePerHour: i <= 4 ? 2500 : 2000,
        pricePerHourPeak: i <= 4 ? 3500 : 3000,
        peakHoursStart: '18:00',
        peakHoursEnd: '22:00',
      },
    });
  }
  console.log('Courts created for Club 1');

  // Create Courts for Club 2
  for (let i = 1; i <= 4; i++) {
    await prisma.court.upsert({
      where: { clubId_courtNumber: { clubId: club2.id, courtNumber: i } },
      update: {},
      create: {
        clubId: club2.id,
        name: `Campo ${i}`,
        courtNumber: i,
        surface: 'ARTIFICIAL_GRASS',
        isIndoor: false,
        hasLighting: true,
        hasCovering: false,
        pricePerHour: 1800,
        pricePerHourPeak: 2500,
        peakHoursStart: '18:00',
        peakHoursEnd: '21:00',
      },
    });
  }
  console.log('Courts created for Club 2');

  // Create some friendships
  await prisma.friendship.upsert({
    where: { initiatorId_receiverId: { initiatorId: players[0].id, receiverId: players[1].id } },
    update: {},
    create: {
      initiatorId: players[0].id,
      receiverId: players[1].id,
      status: 'ACCEPTED',
    },
  });

  await prisma.friendship.upsert({
    where: { initiatorId_receiverId: { initiatorId: players[0].id, receiverId: players[2].id } },
    update: {},
    create: {
      initiatorId: players[0].id,
      receiverId: players[2].id,
      status: 'ACCEPTED',
    },
  });
  console.log('Friendships created');

  // Create initial rankings
  for (let i = 0; i < players.length; i++) {
    await prisma.ranking.upsert({
      where: {
        userId_category_categoryId_period: {
          userId: players[i].id,
          category: 'GENERAL',
          categoryId: '',
          period: 'all-time',
        },
      },
      update: {},
      create: {
        userId: players[i].id,
        points: Math.floor(Math.random() * 1000) + 100,
        position: i + 1,
        matchesPlayed: Math.floor(Math.random() * 50) + 10,
        matchesWon: Math.floor(Math.random() * 30) + 5,
        category: 'GENERAL',
        categoryId: '',
        period: 'all-time',
      },
    });
  }
  console.log('Rankings created');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
