import { describe, expect, test } from 'bun:test'
import { isAdminAuthBypassEnabled, readBooleanEnvValue } from '../../../../api/admin/images/adminAuthPolicy'

describe('readBooleanEnvValue', () => {
  test('parses truthy values', () => {
    expect(readBooleanEnvValue('true')).toBe(true)
    expect(readBooleanEnvValue('1')).toBe(true)
  })

  test('parses falsey values', () => {
    expect(readBooleanEnvValue('false')).toBe(false)
    expect(readBooleanEnvValue('0')).toBe(false)
  })

  test('returns null for unsupported values', () => {
    expect(readBooleanEnvValue('yes')).toBeNull()
    expect(readBooleanEnvValue(undefined)).toBeNull()
  })
})

describe('isAdminAuthBypassEnabled', () => {
  test('forces bypass off in production even when env asks for bypass', () => {
    expect(
      isAdminAuthBypassEnabled({
        rawBypassValue: 'true',
        nodeEnv: 'production',
      }),
    ).toBe(false)
  })

  test('respects explicit value outside production', () => {
    expect(
      isAdminAuthBypassEnabled({
        rawBypassValue: 'false',
        nodeEnv: 'development',
      }),
    ).toBe(false)
    expect(
      isAdminAuthBypassEnabled({
        rawBypassValue: 'true',
        nodeEnv: 'development',
      }),
    ).toBe(true)
  })

  test('defaults to bypass enabled outside production when env is missing', () => {
    expect(
      isAdminAuthBypassEnabled({
        rawBypassValue: undefined,
        nodeEnv: 'development',
      }),
    ).toBe(true)
  })
})
