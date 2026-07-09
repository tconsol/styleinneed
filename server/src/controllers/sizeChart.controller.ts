import { Request, Response } from 'express';
import SizeChart from '../models/SizeChart';

export const getSizeCharts = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.productType) filter.productTypes = req.query.productType;
    const charts = await SizeChart.find(filter).sort({ name: 1 });
    res.json({ data: charts });
  } catch {
    res.status(500).json({ message: 'Failed to fetch size charts' });
  }
};

export const getSizeChartById = async (req: Request, res: Response) => {
  try {
    const chart = await SizeChart.findById(req.params.id);
    if (!chart) return res.status(404).json({ message: 'Size chart not found' });
    res.json({ data: chart });
  } catch {
    res.status(500).json({ message: 'Failed to fetch size chart' });
  }
};

export const createSizeChart = async (req: Request, res: Response) => {
  try {
    const chart = await SizeChart.create(req.body);
    res.status(201).json({ data: chart });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create size chart';
    res.status(400).json({ message: msg });
  }
};

export const updateSizeChart = async (req: Request, res: Response) => {
  try {
    const chart = await SizeChart.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!chart) return res.status(404).json({ message: 'Size chart not found' });
    res.json({ data: chart });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update size chart';
    res.status(400).json({ message: msg });
  }
};

export const deleteSizeChart = async (req: Request, res: Response) => {
  try {
    const chart = await SizeChart.findByIdAndDelete(req.params.id);
    if (!chart) return res.status(404).json({ message: 'Size chart not found' });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete size chart' });
  }
};
