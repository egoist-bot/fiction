import type { EndpointResponse, ResponseStatus, ValidationReason } from '@fiction/core'
import { toSlug } from '@fiction/core'
import { Query } from '../query'
import type { FictionDb } from '.'

type QuerySettings = { fictionDb: FictionDb }

type UsernameResult = { available: ResponseStatus, reason: ValidationReason }

export type CheckColumnValue = { name: string, value: string, minLength?: number, allowReserved?: boolean, allowAnyValue?: boolean }

type CheckUsernameParams = { table: string, columns: CheckColumnValue[] }

export class CheckUsername extends Query<QuerySettings> {
  isUrlFriendly(username: string): boolean {
    return /^[a-zA-Z0-9-_]+$/.test(username)
  }

  async getWords(): Promise<Set<string>> {
    const { words } = await import('../utils/lib/words')
    return new Set(words)
  }

  async run(
    params: CheckUsernameParams,
  ): Promise<EndpointResponse<UsernameResult>> {
    const wordsSet = await this.getWords()
    const { fictionDb } = this.settings
    const { table, columns } = params

    let result: UsernameResult = { available: 'loading', reason: 'loading' }

    try {
      for (const { value, minLength = 1, allowReserved = false, allowAnyValue = false } of columns) {
        const prepped = allowAnyValue ? value.trim() : toSlug(value.trim())

        if (prepped.length < minLength) {
          result = { available: 'fail', reason: 'short' }
          break
        }
        else if (!allowAnyValue && !this.isUrlFriendly(prepped)) {
          result = { available: 'fail', reason: 'invalid' }
          break
        }
        else if (!allowReserved && wordsSet.has(prepped)) {
          result = { available: 'fail', reason: 'reserved' }
          break
        }

        const r = await fictionDb.db?.table(table)
          .where((builder) => {
            columns.forEach(({ name, value }) => {
              const v = allowAnyValue ? value.trim() : toSlug(value.trim())
              void builder.andWhere(name, v)
            })
          })
          .first()

        if (r) {
          result = { available: 'fail', reason: 'taken' }
          break
        }
      }

      if (result.available === 'loading') { // All checks passed
        result = { available: 'success', reason: 'success' }
      }

      return { status: 'success', data: result }
    }
    catch (error) {
      this.log.error('Error checking username', { error, data: params })
      result = { available: 'error', reason: 'error' }
      return { status: 'error', data: result }
    }
  }
}
