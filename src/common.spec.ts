import { createHash, randomFillSync } from "node:crypto"
import { Constr } from "lucid-cardano"
import { describe, expect, it } from "vitest"
import { encodeAddress } from "./common"

function createRandomHash(size = 10) {
  const buf = Buffer.alloc(size)
  const hash = createHash('sha256')
  randomFillSync(buf).toString('hex')
  hash.update(buf)
  return hash.digest('hex')
}

describe('encodeAddress', () => {
  it('should return Constr instance', () => {
    const result = encodeAddress(createRandomHash(), createRandomHash())
    expect(result).toBeInstanceOf(Constr)
  })
})
