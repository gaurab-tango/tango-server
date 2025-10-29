import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyReport extends Document {
  date: Date;
  day: number;
  month: number;
  year: number;
  roomSold: number;
  occupancyPercentage:number;
  totalPax:number;
  expectedArrival:number;
  stayOver:number;
  noShow:number;
  roomRevenue: number;
  arr:number;
  revPerRoom:number;
  restaurantSale:number;
  mealPlanSale:number;
  barSale:number;
  mealPlanPax:number;
  roomsUpgraded:number;
  roomHalfDay:number;
  cld:number;
  cake:number;
  tableDecoration:number;
  expense:number;
  cashDeposit:number;
  pettyCash:number;
  totalRevenue:number;  
  upiDeposit:number;  
  cashReceived:number;  
  submittedBy: mongoose.Types.ObjectId;
}

const DailyReportSchema: Schema = new Schema({
  date: { type: Date, required: true, unique: true },
  day: { type: Number, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  roomSold: { type: Number, required: true },
  occupancyPercentage:{ type: Number, required: true },
  totalAdultPax:{ type: Number, required: true },
  totalChildPax:{ type: Number, required: true },
  expectedArrival:{ type: Number, required: true },
  stayOver:{ type: Number, required: true },
  noShow:{ type: Number, required: true },
  roomRevenue: { type: Number, required: true },
  arr:{ type: Number, required: true },
  revPerRoom:{ type: Number, required: true },
  restaurantSale:{ type: Number, required: true },
  mealPlanSale:{ type: Number, required: true },
  barSale:{ type: Number, required: true },
  mealPlanPax:{ type: Number, required: true },
  roomsUpgraded:{ type: Number, required: true },
  roomHalfDay:{ type: Number, required: true },
  cld:{ type: Number, required: true },
  cake:{ type: Number, required: true },
  tableDecoration:{ type: Number, required: true },
  expense:{ type: Number, required: true },
  cashDeposit:{ type: Number, required: true },
  pettyCash:{ type: Number, required: true },
  totalRevenue:{ type: Number, required: true },
  upiDeposit:{ type: Number, required: true },
  cashReceived:{ type: Number, required: true },
  submittedBy: { type: String, required: true },
});

// Compound index for querying reports by month and year
DailyReportSchema.index({ year: 1, month: 1, day: 1 });
DailyReportSchema.index({ date: -1 }); // or { date: 1 }

export default mongoose.model<IDailyReport>('DailyReport', DailyReportSchema);
