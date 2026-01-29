import {
  world,
  EquipmentSlot,
  ItemLockMode,
  GameMode,
  ItemEnchantableComponent,
  ItemDurabilityComponent,
  EntityEquippableComponent,
  ItemStack,
  Player,
  Dimension,
  Vector3,
} from '@minecraft/server'

const TARGET_BLOCK_TYPE_ID = 'minecraft:stone_shovel'

let globalPlayer: Player | null = null

const SCAN_LIMIT = 64

function checkBlockType(type: string): boolean {
  globalPlayer?.sendMessage("blockType:" + type)
  return type == 'minecraft:gravel'
}

function checkUserSneaking(player: Player): boolean {
  player.sendMessage("player.isSneaking:" + player.isSneaking)
  return player.isSneaking
}


function checkTool(player: Player, tool: ItemStack): boolean {
  player.sendMessage("toolTypeId:" + tool.typeId)
  if (tool.typeId !== TARGET_BLOCK_TYPE_ID) return false

  // ✓ 检查耐久组件
  const durability = tool.getComponent(ItemDurabilityComponent.componentId) as ItemDurabilityComponent
  if (!durability) return false
  // ✓ 耐久度检查（剩余>=1）
  const maxDurability = durability.maxDurability
  let used = durability.damage
  let leftDurability = maxDurability - used
  if (leftDurability < 1) return false // 不够用了

  // ✓ 检查附魔组件
  const enchant = tool.getComponent(ItemEnchantableComponent.componentId) as ItemEnchantableComponent
  if (!enchant) return false
  // ✓ 排除有任何附魔的石镐
  if (enchant.getEnchantments().length) return false

  return true
}

async function dig(player: Player, dimension: Dimension, location: Vector3, blockTypeId: string) {
  globalPlayer = player
  // ✓ 检查被破坏的方块是否为沙砾
  if (!checkBlockType(blockTypeId)) return
  // ✓ 检查玩家是否蹲着
  if (!checkUserSneaking(player)) return
  // ✓ 获取主手物品并判断是否为未附魔石镐
  const equip = player.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent
  if (!equip) return
  const hand = equip.getEquipmentSlot(EquipmentSlot.Mainhand)
  const tool = hand.getItem()
  if (!tool) return
  if (!checkTool(player, tool)) return
  hand.lockMode = ItemLockMode.slot

  player.sendMessage("check finished")

  // let scanLimit1 = Math.min(leftDurability,scanLimit)
  // ✓ 从被破坏的位置，向上最多64格扫描
  // let damaged = 0
  let { x, y, z } = location

  for (let i = 1; i < SCAN_LIMIT; i++) {
    const newY = y + i
    if (newY >= 320) break
    const scanBlock = dimension.getBlock({ x, y: newY, z })
    if (!scanBlock) break
    if (scanBlock.typeId !== TARGET_BLOCK_TYPE_ID) break
    await new Promise<void>((resolve) => {
      scanBlock.setType('air')
      resolve()
    })

    // 生成掉落物（100%掉落沙砾 + 25%概率掉落燧石）
    let dropType = TARGET_BLOCK_TYPE_ID
    if (Math.random() < 0.25) dropType = 'minecraft:flint'
    dimension.spawnItem(new ItemStack(dropType, 1), { x, y: y + i, z })
  }

  // for (let i = 0; i < scanLimit && y + i < 320; i++) {
  //   const scanBlock = dimension.getBlock({ x, y: y + i, z })

  //   // 如果不是沙砾或为空，停止扫描
  //   if (!scanBlock || scanBlock.typeId !== TARGET_BLOCK_TYPE_ID) break

  //   // 破坏沙砾
  //   await new Promise<void>((resolve) => {
  //     scanBlock.setType('air')
  //     resolve()
  //   })
  //   damaged++

  //   // 生成掉落物（100%掉落沙砾 + 25%概率掉落燧石）
  //   let dropType = TARGET_BLOCK_TYPE_ID
  //   if (Math.random() < 0.25) dropType = 'minecraft:flint'
  //   dimension.spawnItem(new ItemStack(dropType, 1), { x, y: y + i, z })
  // }

  // if (damaged > 0) {
  //   // ✓ 更新耐久度，保留1点
  //   durability.damage = used + damaged
  //   if (durability.damage >= maxDurability) durability.damage = maxDurability - 1
  //   hand.setItem(tool)
  //   hand.lockMode = ItemLockMode.none
  // }
  globalPlayer = null
}

// 监听破坏方块事件
world.afterEvents.playerBreakBlock.subscribe(async (e) => {
  const { player, block, dimension } = e
  // ✓ 检查否生存模式
  if (player.getGameMode() !== GameMode.survival) return

  player.sendMessage("you dig")

  const currentBreakBlock = e.brokenBlockPermutation
  const blockTypeId = currentBreakBlock.type.id
  dig(player, dimension, block.location, blockTypeId)
})
