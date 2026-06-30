/**
 * 演示种子数据（Task 9）
 * 5 场精选示例梦境 + 跨梦模式元数据。
 * 梦境 1/2/3 设计为「水 + 负面情绪」跨梦模式，可触发潜意识报告演示。
 * 梦境 4/5 为对比组（飞翔-欢欣 / 坠落-恐惧），同为「空中」主题但情绪相反。
 */
import type { Dream } from '@/lib/types';
import { useDreamStore } from '@/store/useDreamStore';

const DAY = 86400000;
const NOW = Date.now();

/** 5 场精选示例梦境（id 固定 seed-1..seed-5，避免重复加载） */
export const SEED_DREAMS: Dream[] = [
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
      imageUrl: '/seeds/dark-fantasy-anxious.svg',
      imageSource: 'seed',
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
      imageUrl: '/seeds/ethereal-anxious.svg',
      imageSource: 'seed',
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
    id: 'seed-3',
    createdAt: NOW - 3 * DAY,
    rawText:
      '我在一个房间里，水从地板缝隙中渗出来，开始只是一小滩，后来越来越多。我试图堵住缝隙，但新的缝隙又出现了。水位涨到脚踝时，我感到一种无力的绝望。',
    emotion: { word: '无力', intensity: 0.82, tone: 'negative' },
    aestheticPreset: 'Mystical',
    color: '#5A189A',
    tags: ['水', '渗水', '无力', '堵缝隙'],
    artifact: {
      imageUrl: '/seeds/mystical-sad.svg',
      imageSource: 'seed',
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
      imageUrl: '/seeds/ethereal-excited.svg',
      imageSource: 'seed',
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
      imageUrl: '/seeds/dark-fantasy-anxious.svg',
      imageSource: 'seed',
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
];

/** 跨梦模式元数据（供潜意识报告演示读取） */
export interface SeedPattern {
  symbol: string;
  count: number;
  description: string;
}

export const SEED_PATTERNS: SeedPattern[] = [
  {
    symbol: '水',
    count: 3,
    description:
      '近期 3 个梦境都出现了水元素与负面情绪（焦虑/无力），可能提示持续的情绪压力源未被处理。',
  },
  {
    symbol: '空中主题',
    count: 2,
    description:
      '飞翔（欢欣）与坠落（恐惧）形成对比组，同为「空中」主题但情绪基调相反，反映心理状态的两极张力。',
  },
];

/**
 * 将种子梦境加载到 store（按 id 去重，已存在则跳过）。
 * 供 GalleryPage 首次自动加载与 SeedDataPanel 手动加载复用。
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
