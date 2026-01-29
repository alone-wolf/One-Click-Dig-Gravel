/* eslint-disable camelcase */

// 沙砾的掉落物配置
const gravel = {
  item: 'gravel', // 可能掉落沙砾
  xp: [0, 0], // 经验值范围
  probability: [1, 1], // 掉落物数量范围（平均3/10概率掉落燧石）
  support: {
    fortune: true,
    silk_touch: true
  }
}

const red_sand = {
  item: 'red_sand',
  xp: [0, 0],
  probability: [1, 1],
  support: {
    fortune: true,
    silk_touch: true
  }
}

export default {
  'minecraft:gravel': gravel,
  'minecraft:red_sand': red_sand
}
