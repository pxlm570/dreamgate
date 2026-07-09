/**
 * 演示种子数据（Task 9 · 07-09 扩容至 9 条）
 * 精选示例梦境 + 跨梦模式元数据。设计的跨梦模式：
 * - 水 ×4（seed-1/2/3 负面 + seed-9 安然）：持续意象 + 情绪基调变化
 * - 门 ×3（seed-2/6/8）：呼应「镜之门」产品主题的自指意象
 * - 飞翔（欢欣）↔ 坠落（恐惧）对比组：同为「空中」主题但情绪相反
 */
import type { Dream } from '@/lib/types';
import { useDreamStore } from '@/store/useDreamStore';

const DAY = 86400000;
const NOW = Date.now();

/** 精选示例梦境（id 固定 seed-N，避免重复加载） */
export const SEED_DREAMS: Dream[] = [
  {
    id: 'seed-6',
    createdAt: NOW - 9 * DAY,
    rawText:
      '我走在一片起风的麦田里，田中央立着一扇白色的门——没有墙，只有门。我绕到门后看，那里什么都没有；可当我推开门穿过去，眼前是一片安静的海。',
    emotion: { word: '宁静', intensity: 0.72, tone: 'positive' },
    aestheticPreset: 'Ethereal',
    color: '#C9B8E8',
    tags: ['门', '麦田', '海', '穿过'],
    artifact: {
      imageUrl: '/seeds-gen/seed-6.png',
      imageSource: 'ai',
      emotionAnalysis:
        '无墙之门是梦境中罕见而优雅的"阈限"意象——门的意义不在隔断，而在跨越本身。绕到门后一无所有、穿过门却抵达海，揭示了一个温柔的悖论：转变不能被旁观或分析，只能被亲身经历。门后的海承接了此前梦境中反复出现的水意象，但这一次水是平静的——暗示梦者与某个长期的情绪主题正在达成和解。',
      symbols: [
        { name: '门', probability: 0.9, note: '阈限意象，转变只能亲历而非旁观' },
        { name: '水', probability: 0.8, note: '门后安静的海，与水主题的和解' },
        { name: '麦田', probability: 0.7, note: '风中原野，开阔而不确定的当下' },
      ],
      analysisSource: 'ai',
    },
  },
  {
    id: 'seed-7',
    createdAt: NOW - 8 * DAY,
    rawText:
      '我在一座旧城的窄巷里被人追，看不清他的脸。巷子越跑越窄，两侧的墙几乎贴上肩膀。转过最后一个拐角，追我的人不见了，眼前是我小时候住过的院子，灯还亮着。',
    emotion: { word: '恐惧', intensity: 0.78, tone: 'negative' },
    aestheticPreset: 'Dark Fantasy',
    color: '#6A0572',
    tags: ['追逐', '窄巷', '无脸人', '老家'],
    artifact: {
      imageUrl: '/seeds-gen/seed-7.png',
      imageSource: 'ai',
      emotionAnalysis:
        '追逐梦是最普遍的焦虑梦型之一，而"看不清脸的追逐者"通常不是外部威胁，而是被回避的自我议题——看不清，是因为不愿看清。巷子收窄映射着回避空间的耗尽：逃避的路越走越窄。结尾的转折意味深长——穷途处出现的不是追逐者，而是亮着灯的童年院落，暗示恐惧的尽头可能藏着被遗忘的安全感来源，追逐者想把梦者赶回的，或许正是某个需要重新面对的起点。',
      symbols: [
        { name: '追逐', probability: 0.92, note: '被回避的自我议题，无脸=不愿看清' },
        { name: '窄巷', probability: 0.76, note: '回避空间的耗尽，退路收窄' },
        { name: '家', probability: 0.74, note: '恐惧尽头的童年院落，被遗忘的安全感' },
      ],
      analysisSource: 'ai',
    },
  },
  {
    id: 'seed-1',
    createdAt: NOW - 6 * DAY,
    rawText:
      '我站在一片无边的深海边，海水是墨蓝色的，缓缓上涨。我感到脚下的沙正在被冲走，想要后退却无法移动。远处有一座灯塔，但灯光忽明忽暗。',
    emotion: { word: '焦虑', intensity: 0.75, tone: 'negative' },
    aestheticPreset: 'Dark Fantasy',
    color: '#EF476F',
    tags: ['水', '海边', '灯塔', '无法移动'],
    artifact: {
      imageUrl: '/seeds-gen/seed-1.png',
      imageSource: 'ai',
      emotionAnalysis:
        '这个梦境呈现了典型的"被吞没"焦虑意象。墨蓝深海象征着潜意识中未被面对的情感深渊，海水上涨暗示着情绪压力的累积。脚下沙被冲走反映了现实安全感的不稳定，而无法移动则映射了梦中常见的"睡眠瘫痪"心理机制——理智清醒但情感行动受阻。远处忽明忽暗的灯塔可能代表着摇摆不定的指引或希望，暗示梦者在困境中仍在寻找方向。',
      symbols: [
        { name: '水', probability: 0.92, note: '墨蓝深海象征潜意识深渊与情绪压力' },
        { name: '灯塔', probability: 0.78, note: '摇摆的指引，渴望方向与拯救' },
        { name: '无法移动', probability: 0.85, note: '睡眠瘫痪意象，行动力受阻' },
      ],
      analysisSource: 'ai',
    },
  },
  {
    id: 'seed-2',
    createdAt: NOW - 5 * DAY,
    rawText:
      '下雨了，雨很大，我在一条陌生的街道上奔跑，想要找到一个避雨的地方。所有的门都关着，雨水浸透了我的衣服。我终于看到一扇开着的门，但进去后发现是一个无尽的走廊。',
    emotion: { word: '焦虑', intensity: 0.68, tone: 'negative' },
    aestheticPreset: 'Ethereal',
    color: '#C9B8E8',
    tags: ['水', '雨', '奔跑', '走廊'],
    artifact: {
      imageUrl: '/seeds-gen/seed-2.png',
      imageSource: 'ai',
      emotionAnalysis:
        '暴雨与奔跑构成了强烈的焦虑叙事。雨水浸透衣服象征着外界压力已渗入个人边界，所有门关闭则映射了社会支持系统的暂时缺位。无尽走廊是经典的"过渡空间"意象——梦者处于困境与出口之间，寻找但尚未抵达。与水相关的梦境常出现在情绪超载时期。',
      symbols: [
        { name: '水', probability: 0.88, note: '暴雨象征情绪超载与外界压力' },
        { name: '门', probability: 0.82, note: '关闭的门映射支持缺位，开启的门是转机' },
        { name: '走廊', probability: 0.75, note: '过渡空间，处于困境与出口之间' },
      ],
      analysisSource: 'ai',
    },
  },
  {
    id: 'seed-8',
    createdAt: NOW - 4 * DAY,
    rawText:
      '梦里有一座极高的图书馆，中间是一部旋转楼梯，每一层都只有一扇木门。我推开一扇，门里是落雪的冬天；再推开一扇，是蝉鸣的夏夜。我一直往上走，很想知道顶层那扇门的后面是什么。',
    emotion: { word: '出神', intensity: 0.7, tone: 'neutral' },
    aestheticPreset: 'Mystical',
    color: '#5A189A',
    tags: ['门', '图书馆', '楼梯', '季节'],
    artifact: {
      imageUrl: '/seeds-gen/seed-8.png',
      imageSource: 'ai',
      emotionAnalysis:
        '图书馆是"内在知识库"的经典象征，旋转楼梯则是缓慢的、盘旋上升的自我探索。每层一扇门、门后是不同季节——门在这里是"可能性"的容器：每一次推开都是一次时间与心境的切换。持续向上、想看顶层的门，流露出一种安静而执着的好奇。值得注意的是"门"意象在近期梦境中反复出现（雨夜之门、麦田之门、季节之门），可能提示梦者正处于某个选择或转变的酝酿期。',
      symbols: [
        { name: '门', probability: 0.88, note: '可能性的容器，每次推开都是一次切换' },
        { name: '楼梯', probability: 0.76, note: '盘旋上升的自我探索' },
        { name: '图书馆', probability: 0.7, note: '内在知识库，记忆与经验的收藏' },
      ],
      analysisSource: 'ai',
    },
  },
  {
    id: 'seed-3',
    createdAt: NOW - 3 * DAY,
    rawText:
      '我在一个房间里，水从地板缝隙中渗出来，开始只是一小滩，后来越来越多。我试图堵住缝隙，但新的缝隙又出现了。水位涨到脚踝时，我感到一种无力的绝望。',
    emotion: { word: '无力', intensity: 0.82, tone: 'negative' },
    aestheticPreset: 'Mystical',
    color: '#5A189A',
    tags: ['水', '渗水', '无力', '堵缝隙'],
    artifact: {
      imageUrl: '/seeds-gen/seed-3.png',
      imageSource: 'ai',
      emotionAnalysis:
        '渗水梦境是"失控"主题的经典表达。水位渐进上涨映射着情绪问题的累积性——小问题被忽视后会逐渐扩散。反复堵缝隙却出现新缝隙，揭示了"治标不治本"的心理困境。脚踝水位时的无力绝望，是情绪耗竭的信号。此梦与前两个水主题梦境形成跨梦模式：水反复出现，提示梦者近期可能存在持续的情绪压力源未被处理。',
      symbols: [
        { name: '水', probability: 0.95, note: '渗水象征情绪问题的渐进性失控' },
        { name: '房间', probability: 0.72, note: '内心空间的入侵，私人边界被突破' },
        { name: '堵缝隙', probability: 0.8, note: '治标不治本的应对模式' },
      ],
      analysisSource: 'ai',
    },
  },
  {
    id: 'seed-4',
    createdAt: NOW - 2 * DAY,
    rawText:
      '我突然发现自己能飞了。从窗台轻轻一跃，便漂浮在城市的上空。风从耳边掠过，下面是闪烁的灯火。我感到一种久违的自由，好像卸下了所有重量。',
    emotion: { word: '欢欣', intensity: 0.88, tone: 'positive' },
    aestheticPreset: 'Ethereal',
    color: '#FFD166',
    tags: ['飞翔', '城市', '自由', '灯火'],
    artifact: {
      imageUrl: '/seeds-gen/seed-4.png',
      imageSource: 'ai',
      emotionAnalysis:
        '飞翔是梦境中最普遍的"超越"意象之一。从窗台跃出代表着打破日常框架的勇气，漂浮在城市上空则提供了俯视视角——从更高维度看待生活。卸下重量感与久违的自由，暗示梦者在现实中可能刚刚完成了一次重要的释放或突破。闪烁灯火下方是人间烟火，飞翔者并未逃离，而是获得了重新审视的距离。',
      symbols: [
        { name: '飞翔', probability: 0.9, note: '超越意象，打破框架的自由渴望' },
        { name: '城市', probability: 0.68, note: '人间烟火，获得俯视距离' },
        { name: '窗', probability: 0.72, note: '从日常跃出的边界象征' },
      ],
      analysisSource: 'ai',
    },
  },
  {
    id: 'seed-5',
    createdAt: NOW - 1 * DAY,
    rawText:
      '我在一座高塔的楼梯上往下走，突然楼梯消失了，我开始坠落。风声很大，我试图抓住什么但什么都抓不到。在即将触地的那一刻，我醒了，心跳很快。',
    emotion: { word: '恐惧', intensity: 0.9, tone: 'negative' },
    aestheticPreset: 'Dark Fantasy',
    color: '#6A0572',
    tags: ['坠落', '高塔', '楼梯消失', '心跳'],
    artifact: {
      imageUrl: '/seeds-gen/seed-5.png',
      imageSource: 'ai',
      emotionAnalysis:
        '坠落梦是仅次于飞翔的高频梦境主题。楼梯消失象征着原有支撑结构的突然失效——可能是现实中的某种安全感崩塌。试图抓住却抓不到，反映了失控感中的无助。即将触地时惊醒是典型的"坠落惊醒"机制，与生理上的肌张力变化有关。心跳加速是身体对梦境恐惧的真实生理反应。',
      symbols: [
        { name: '坠落', probability: 0.93, note: '失控与支撑失效的经典意象' },
        { name: '塔', probability: 0.78, note: '高度象征地位或心理位置的骤降' },
        { name: '楼梯', probability: 0.7, note: '消失的支撑结构，秩序崩塌' },
      ],
      analysisSource: 'ai',
    },
  },
  {
    id: 'seed-9',
    createdAt: NOW - 0.5 * DAY,
    rawText:
      '我乘着一部玻璃电梯往深海里下沉。水压没有让我害怕，四周越来越暗，只有远处一点微光。一头鲸从电梯旁缓缓游过，眼睛很大，像是在看我。我心里异常安静。',
    emotion: { word: '安然', intensity: 0.76, tone: 'neutral' },
    aestheticPreset: 'Mystical',
    color: '#5A189A',
    tags: ['水', '深海', '鲸', '电梯'],
    artifact: {
      imageUrl: '/seeds-gen/seed-9.png',
      imageSource: 'ai',
      emotionAnalysis:
        '这是一个意味深长的转折之梦。此前的水梦（上涨的海、暴雨、渗水）都伴随焦虑与无力，而这一次，梦者主动乘电梯下沉——不再抵抗水，而是有保护地（玻璃电梯）进入它的深处。深海即潜意识深层，鲸是其中缓慢而庞大的居民，它注视的目光温和而非威胁。整个梦的基调是"安静"：对照早前的水梦，这几乎是一次和解的仪式——梦者开始有能力靠近曾经淹没自己的东西。',
      symbols: [
        { name: '水', probability: 0.9, note: '深海即潜意识深层，从抵抗转为进入' },
        { name: '鲸', probability: 0.8, note: '潜意识中庞大而温和的存在，注视而非威胁' },
        { name: '电梯', probability: 0.68, note: '有保护的下潜，可控的深入' },
      ],
      analysisSource: 'ai',
    },
  },
];

/**
 * 将种子梦境加载到 store（按 id 去重，已存在则跳过）。
 * 供 WorldPage 首次自动加载/扩容追加迁移与 SeedDataPanel 手动加载复用。
 */
export async function loadSeeds(): Promise<void> {
  const { dreams, addDream } = useDreamStore.getState();
  const existing = new Set(dreams.map((d) => d.id));
  for (const dream of SEED_DREAMS) {
    if (!existing.has(dream.id)) {
      await addDream(dream);
    }
  }
}
