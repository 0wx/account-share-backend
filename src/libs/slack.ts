import axios from 'axios'
import { pool } from '..'
import { prisma } from '../db/prisma'
import { Employee } from './pool'

export const sendMessage = async (message: string) => {
  try {
    const active = pool.getSockets().map((s) => ({
      email: s.data.account.email,
      name: s.data.account.name,
    }))
    const allAccounts = await prisma.sharedAccount.findMany({
      include: {
        account: true,
      },
    })

    const accounts = allAccounts.map((account) => ({
      email: account.email,
      name: account.account.name,
    }))

    const availableAccounts = accounts.filter(
      (account) =>
        !active.find(
          (a) => a.email === account.email && a.name === account.name
        )
    )

    const unavailableAccounts = accounts.filter((account) =>
      active.find((a) => a.email === account.email && a.name === account.name)
    )

    const availableAccountsString = availableAccounts
      .map((account) => `${account.name} (${account.email})`)
      .join('\n')
    const unavailableAccountsString = unavailableAccounts
      .map((account) => `${account.name} (${account.email})`)
      .join('\n')

    console.log(active)
    console.log(accounts)

    return await axios.post(
      'https://hooks.slack.com/services/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',
      {
        text: `${message}\n\n\n Available accounts:\n${availableAccountsString}\n\nUnavailable accounts:\n${unavailableAccountsString} \n ------------- \n`,
      },
      {
        headers: {
          'Content-type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.log(error)
  }
}
