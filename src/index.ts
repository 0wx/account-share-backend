import express from 'express'
import { Socket, Server } from 'socket.io'
import cors from 'cors'
import { Account, Rule } from '@prisma/client'
import { Data, Pool } from './libs/pool'
import { prisma } from './db/prisma'

export const pool = new Pool()

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

const http = require('http').createServer(app)
const io = new Server(http, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

app.get('/accounts', async (req, res) => {
  const accounts = await prisma.account.findMany({
    include: {
      rules: true,
    },
  })
  res.json(accounts)
})

app.post('/accounts', async (req, res) => {
  const account = req.body.account as Account
  const rules = req.body.rules as Rule[]
  const newAccount = await prisma.account.create({
    data: account,
  })

  const newRules = await prisma.rule.createMany({
    data: rules.map((rule) => ({ ...rule, accountId: newAccount.id })),
  })

  res.json({ account: newAccount, rules: newRules })
})

app.delete('/accounts/:id', async (req, res) => {
  const id = +req.params.id as number
  const account = await prisma.account.delete({
    where: { id },
  })
  res.json(account)
})



io.on('connection', (socket: Socket) => {
  socket.on('disconnect', () => {
    pool.disconnectSocket(socket)
  })

  socket.on('opened', (data: Data) => {
    pool.addSocket(data, socket)
  })
})

pool.polling()
http.listen(port)
