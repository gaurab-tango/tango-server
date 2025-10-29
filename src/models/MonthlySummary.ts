import mongoose, { Schema, Document } from 'mongoose';

export interface IMonthlySummary extends Document {
  month: number;
  year: number;
  totalRoomSold:number;
  avgRoomPerDay: number;
  avgOccupancy :number;
  totalRoomRevenue: number;
  arr :number;
  revPerRoom:number;
  totalRestaurantSale:number;
  totalMealPlanSale:number;
  totalBarSale:number;
  totalCld:number;
  totalCake:number;
  totalExpense:number;
  totalCashDeposit:number;
  totalPettyCash:number;
  totalMonthRevenue:number; 
  totalUpiDeposit:number;  
  totalCashReceived:number;  
  totalAdult: number;
  totalChild: number;
}

const MonthlySummarySchema: Schema = new Schema({
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  totalRoomSold:{ type: Number, default: 0 },
  avgRoomPerDay: { type: Number, default: 0 },
  avgOccupancy :{ type: Number, default: 0 },
  totalRoomRevenue: { type: Number, default: 0 },
  arr :{ type: Number, default: 0 },
  revPerRoom:{ type: Number, default: 0 },
  totalRestaurantSale:{ type: Number, default: 0 },
  totalMealPlanSale:{ type: Number, default: 0 },
  totalBarSale:{ type: Number, default: 0 },
  totalCld:{ type: Number, default: 0 },
  totalCake:{ type: Number, default: 0 },
  totalExpense:{ type: Number, default: 0 },
  totalCashDeposit:{ type: Number, default: 0 },
  totalPettyCash:{ type: Number, default: 0 },
  totalMonthRevenue:{ type: Number, default: 0 },
  totalUpiDeposit:{ type: Number, default: 0 },
  totalCashReceived:{ type: Number, default: 0 },
  totalAdult: { type: Number, default: 0 },
  totalChild: { type: Number, default: 0 }
});

// Compound index for finding summaries by month and year
MonthlySummarySchema.index({ year: 1, month: 1 }, { unique: true });

export default mongoose.model<IMonthlySummary>('MonthlySummary', MonthlySummarySchema);
