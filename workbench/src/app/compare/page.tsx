import {ComparisonShowcase} from '@/components/comparison-showcase';
import provenance from '../../../public/comparison/provenance.json';
import type {ProductDocument} from '@/domain/contracts';

export const metadata={title:'免费合成与 AI 场景对比 · MiaoCut',description:'使用同一商品与构图，对比本地合成与已保存的真实 AI 场景结果。'};

export default function ComparePage() {
  return <ComparisonShowcase samples={provenance.samples.map(sample=>({...sample,document:sample.document as ProductDocument}))}/>;
}
