/**
 * 情绪词库（spec 附录 B）
 * 4 维 × 6 词 = 24 个细粒度情绪词。
 * 借鉴 How We Feel 的情绪颗粒度。
 */
import type { EmotionEntry } from './types';

/**
 * 24 个情绪词，按维度分组。
 * dimension:
 *   - high-pleasant   高涨-愉悦：兴奋 / 欢欣 / 惊喜 / 感激 / 宁静 / 释然
 *   - high-unpleasant 高涨-不悦：焦虑 / 恐惧 / 愤怒 / 羞愧 / 焦躁 / 崩溃
 *   - low-pleasant    低落-愉悦：温柔 / 怀念 / 沉醉 / 慵懒 / 安然 / 出神
 *   - low-unpleasant  低落-不悦：悲伤 / 孤独 / 迷失 / 空虚 / 无力 / 沉重
 */
export const EMOTIONS: EmotionEntry[] = [
  // —— 高涨-愉悦 ——
  {
    word: '兴奋',
    tone: 'positive',
    dimension: 'high-pleasant',
    color: '#FF6B9D',
    keywords: ['兴奋', '激动', '亢奋', '雀跃', '振奋', '热血', 'high'],
  },
  {
    word: '欢欣',
    tone: 'positive',
    dimension: 'high-pleasant',
    color: '#FFD166',
    keywords: ['欢欣', '欢乐', '欢喜', '愉悦', '喜悦', '高兴', '快乐', '开心'],
  },
  {
    word: '惊喜',
    tone: 'positive',
    dimension: 'high-pleasant',
    color: '#FF9F1C',
    keywords: ['惊喜', '意外', '震惊', '出乎意料', '意想不到'],
  },
  {
    word: '感激',
    tone: 'positive',
    dimension: 'high-pleasant',
    color: '#06D6A0',
    keywords: ['感激', '感谢', '感恩', '温暖', '被爱', '动容'],
  },
  {
    word: '宁静',
    tone: 'positive',
    dimension: 'high-pleasant',
    color: '#4ECDC4',
    keywords: ['宁静', '安静', '平静', '安详', '安宁', '祥和', '静谧'],
  },
  {
    word: '释然',
    tone: 'positive',
    dimension: 'high-pleasant',
    color: '#95D5B2',
    keywords: ['释然', '放下', '解脱', '轻松', '松一口气', '宽心'],
  },

  // —— 高涨-不悦 ——
  {
    word: '焦虑',
    tone: 'negative',
    dimension: 'high-unpleasant',
    color: '#EF476F',
    keywords: ['焦虑', '担忧', '担心', '不安', '紧张', '忐忑', '心慌'],
  },
  {
    word: '恐惧',
    tone: 'negative',
    dimension: 'high-unpleasant',
    color: '#6A0572',
    keywords: ['恐惧', '害怕', '怕', '惊恐', '骇', '畏惧', '胆寒'],
  },
  {
    word: '愤怒',
    tone: 'negative',
    dimension: 'high-unpleasant',
    color: '#D62828',
    keywords: ['愤怒', '生气', '恼火', '怒', '气愤', '暴怒', '恼怒'],
  },
  {
    word: '羞愧',
    tone: 'negative',
    dimension: 'high-unpleasant',
    color: '#C9184A',
    keywords: ['羞愧', '羞耻', '丢脸', '尴尬', '无地自容', '难堪'],
  },
  {
    word: '焦躁',
    tone: 'negative',
    dimension: 'high-unpleasant',
    color: '#F77F00',
    keywords: ['焦躁', '烦躁', '躁动', '不耐烦', '坐立不安', '心烦'],
  },
  {
    word: '崩溃',
    tone: 'negative',
    dimension: 'high-unpleasant',
    color: '#3A0CA3',
    keywords: ['崩溃', '崩塌', '瓦解', '受不了', '撑不住', '垮掉'],
  },

  // —— 低落-愉悦 ——
  {
    word: '温柔',
    tone: 'positive',
    dimension: 'low-pleasant',
    color: '#FFAFCC',
    keywords: ['温柔', '柔和', '温存', '轻柔', '暖', '柔软'],
  },
  {
    word: '怀念',
    tone: 'mixed',
    dimension: 'low-pleasant',
    color: '#B5838D',
    keywords: ['怀念', '想念', '思念', '回忆', '怀旧', '从前', '曾经'],
  },
  {
    word: '沉醉',
    tone: 'mixed',
    dimension: 'low-pleasant',
    color: '#9D4EDD',
    keywords: ['沉醉', '陶醉', '沉迷', '沉浸', '着迷', '迷恋'],
  },
  {
    word: '慵懒',
    tone: 'neutral',
    dimension: 'low-pleasant',
    color: '#A8DADC',
    keywords: ['慵懒', '懒散', '倦怠', '困倦', '倦', '懒得'],
  },
  {
    word: '安然',
    tone: 'positive',
    dimension: 'low-pleasant',
    color: '#BDE0FE',
    keywords: ['安然', '安好', '安稳', '安心', '坦然', '踏实'],
  },
  {
    word: '出神',
    tone: 'neutral',
    dimension: 'low-pleasant',
    color: '#CDB4DB',
    keywords: ['出神', '恍惚', '发呆', '失神', '迷离', '空灵', '神游'],
  },

  // —— 低落-不悦 ——
  {
    word: '悲伤',
    tone: 'negative',
    dimension: 'low-unpleasant',
    color: '#457B9D',
    keywords: ['悲伤', '难过', '伤心', '哀伤', '悲痛', '泪', '哭泣'],
  },
  {
    word: '孤独',
    tone: 'negative',
    dimension: 'low-unpleasant',
    color: '#1D3557',
    keywords: ['孤独', '孤单', '寂寞', '落寞', '孤零零', '形单影只'],
  },
  {
    word: '迷失',
    tone: 'mixed',
    dimension: 'low-unpleasant',
    color: '#6C757D',
    keywords: ['迷失', '迷茫', '不知所措', '找不到路', '方向', '茫然失措'],
  },
  {
    word: '空虚',
    tone: 'negative',
    dimension: 'low-unpleasant',
    color: '#495057',
    keywords: ['空虚', '空洞', '虚无', '无意义', '茫然', '落空'],
  },
  {
    word: '无力',
    tone: 'negative',
    dimension: 'low-unpleasant',
    color: '#5A189A',
    keywords: ['无力', '疲惫', '疲倦', '乏', '瘫', '使不上劲', '虚脱'],
  },
  {
    word: '沉重',
    tone: 'negative',
    dimension: 'low-unpleasant',
    color: '#212529',
    keywords: ['沉重', '压', '压抑', '负担', '喘不过气', '沉甸甸'],
  },
];

/** 默认情绪（无匹配时） */
export const DEFAULT_EMOTION = {
  word: '出神',
  intensity: 0.4,
  tone: 'neutral' as const,
};

/** 按词查找情绪条目 */
export function getEmotionByWord(word: string): EmotionEntry | undefined {
  return EMOTIONS.find((e) => e.word === word);
}
