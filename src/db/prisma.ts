import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

prisma.$connect()
  .then(() => {
    console.log('Connected to database')
  })
  .catch((e) => {
    console.log('Error connecting to database')
    console.log(e)
  })
