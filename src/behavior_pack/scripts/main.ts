/* eslint-disable max-depth */
/* eslint-disable camelcase */
// main
import {
  world,
  system,
  ItemStack,
  ItemLockMode,
  GameMode,
  Player,
  Dimension,
  EquipmentSlot,
  EntityEquippableComponent,
  ItemDurabilityComponent,
  ItemEnchantableComponent
} from '@minecraft/server'
import { splitGroups } from '@mcbe-mods/utils'

import shovel_level from './shovel_level'

const GRAVEL_BLOCK_ID = 'minecraft:gravel'
const FLINT_ITEM_ID = 'minecraft:flint'

const isSurvivalPlayer = (dimension: Dimension, player: Player) =>
  dimension.getPlayers({ gameMode: GameMode.survival }).some((p) => p.name === player.name)

function getMaxBuildHeight(dimension: Dimension): number {
  const heightRange = (dimension as { heightRange?: { max: number } }).heightRange
  if (heightRange && typeof heightRange.max === 'number') return heightRange.max
  return 256
}

function shouldConsumeDurability(unbreakingLevel: number): boolean {
  if (unbreakingLevel <= 0) return true
  return Math.floor(Math.random() * (unbreakingLevel + 1)) === 0
}

function getFlintChance(fortuneLevel: number): number {
  const level = Math.max(0, Math.min(fortuneLevel, 3))
  const denominator = 10 - 2 * level
  return 1 / denominator
}

world.afterEvents.playerBreakBlock.subscribe((e) => {
  const { dimension, player, block } = e

  // Player must be sneaking and breaking gravel
  if (!player.isSneaking || block.typeId !== GRAVEL_BLOCK_ID) return

  const equipmentInventory = player.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent
  if (!equipmentInventory) return

  const mainHand = equipmentInventory.getEquipmentSlot(EquipmentSlot.Mainhand)
  const currentSlotItem = mainHand.getItem()
  if (!currentSlotItem) return

  // Must be holding a shovel that can dig gravel
  if (!currentSlotItem.hasTag('is_shovel')) return
  const shovel = shovel_level[currentSlotItem.typeId as keyof typeof shovel_level]
  if (!shovel || !shovel.includes(GRAVEL_BLOCK_ID)) return

  const survivalPlayer = isSurvivalPlayer(dimension, player)
  if (!survivalPlayer) return

  const itemDurability = currentSlotItem.getComponent(ItemDurabilityComponent.componentId) as ItemDurabilityComponent
  if (!itemDurability) return

  const enchantments = currentSlotItem.getComponent(ItemEnchantableComponent.componentId) as
    | ItemEnchantableComponent
    | undefined

  const unbreaking = enchantments?.getEnchantment('unbreaking')?.level ?? 0
  const silkTouch = enchantments?.hasEnchantment('silk_touch') ?? false
  const fortune = enchantments?.getEnchantment('fortune')?.level ?? 0

  let damage = itemDurability.damage
  const maxDurability = itemDurability.maxDurability
  let remaining = maxDurability - damage

  // Preserve 1 durability; let vanilla handle when too low
  if (remaining <= 1) return

  const dropLocation = { ...block.location }
  mainHand.lockMode = ItemLockMode.slot

  system.run(() => {
    try {
      const lockedItem = mainHand.getItem()
      if (!lockedItem) return

      const lockedDurability = lockedItem.getComponent(ItemDurabilityComponent.componentId) as
        | ItemDurabilityComponent
        | undefined
      if (!lockedDurability) return

      const lockedEnchantments = lockedItem.getComponent(ItemEnchantableComponent.componentId) as
        | ItemEnchantableComponent
        | undefined

      const lockedUnbreaking = lockedEnchantments?.getEnchantment('unbreaking')?.level ?? unbreaking
      const lockedSilkTouch = lockedEnchantments?.hasEnchantment('silk_touch') ?? silkTouch
      const lockedFortune = lockedEnchantments?.getEnchantment('fortune')?.level ?? fortune

      let currentDamage = lockedDurability.damage
      const currentMaxDurability = lockedDurability.maxDurability
      let currentRemaining = currentMaxDurability - currentDamage

      if (currentRemaining <= 1) return

      const maxY = getMaxBuildHeight(dimension)
      let gravelCount = 0
      let flintCount = 0
      const flintChance = lockedSilkTouch ? 0 : getFlintChance(lockedFortune)

      for (let y = dropLocation.y; y <= maxY; y++) {
        if (currentRemaining <= 1) break

        const target = dimension.getBlock({ x: dropLocation.x, y, z: dropLocation.z })
        if (!target) break
        if (target.typeId !== GRAVEL_BLOCK_ID) break

        target.setType('minecraft:air')

        if (lockedSilkTouch) {
          gravelCount++
        } else if (Math.random() < flintChance) {
          flintCount++
        } else {
          gravelCount++
        }

        if (shouldConsumeDurability(lockedUnbreaking)) {
          currentDamage++
          currentRemaining = currentMaxDurability - currentDamage
        }
      }

      if (gravelCount > 0) {
        splitGroups(gravelCount).forEach((group) => {
          dimension.spawnItem(new ItemStack(GRAVEL_BLOCK_ID, group), dropLocation)
        })
      }

      if (flintCount > 0) {
        splitGroups(flintCount).forEach((group) => {
          dimension.spawnItem(new ItemStack(FLINT_ITEM_ID, group), dropLocation)
        })
      }

      lockedDurability.damage = currentDamage
      mainHand.setItem(lockedItem)
    } catch (_error) {
      /* eslint-disable no-console */
      const error = _error as Error
      console.error(error.name)
      console.error(error.message)
      console.error(error)
      /* eslint-enable no-console */
    } finally {
      mainHand.lockMode = ItemLockMode.none
    }
  })
})
