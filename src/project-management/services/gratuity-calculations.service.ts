import { Injectable } from "@nestjs/common";
import { DecrementTableEntry, SalaryIncreaseAssumptions } from "../interfaces";

@Injectable()
export class GratuityCalculationsService {

    ALD(
        age: number,
        ps: number,
        pay: number,
        discountRate: number,
        salaryIncreaseAssumptions: SalaryIncreaseAssumptions,
        output: number,
        decrementTable: DecrementTableEntry[],
        serviceCap: number,
        serviceType: number,
        monthsToSalaryInc: number,
        retAge: number,
        beginEndDeath: { begin: number[], end: number[], death: number[] }
    ): any {
        let ALDResult = 0;
        let NCDResult = 0;
    
        for (let t = 0; t <= (retAge - age - 1); t++) {
            const ts = ps + 0.5 + t;
            const pa = age + t;
            const qdpa = this.getDecrementTableEntryByAge(pa, decrementTable);
            const qdage = this.getDecrementTableEntryByAge(age, decrementTable)
            const qd = (qdpa?.DD / qdage?.LX) ?? 0;
            // const qd = decrementTable[`dec${pa - 16}8`] / decrementTable[`dec${age - 16}6`];
            
            // let sif = 1;
            // let hs = 1;
            const {sif, hs} = this.calculateSIFandHS(monthsToSalaryInc, t, salaryIncreaseAssumptions);
            // Simplified logic for sif and hs calculations
            // This part should be expanded to accurately reflect your specific logic
            // based on monthsToSalaryInc and other variables
            
            let ts1;
            if (Number(serviceType) === 1) {
                ts1 = ts;
            } else if (Number(serviceType) === 2) {
                ts1 = Math.round(ts);
            } else {
                ts1 = Math.floor(ts); // Assuming this as the equivalent of RoundDown
            }
            
            let rgf = 0;
            // Determine rgf based on ts falling within begin and end ranges
            for (let i = 0; i < beginEndDeath.begin.length; i++) {
                if (ts >= beginEndDeath.begin[i] && ts < beginEndDeath.end[i]) {
                    rgf = beginEndDeath.death[i];
                    break;
                }
            }
            if (rgf === 0) rgf = beginEndDeath.death[beginEndDeath.death.length - 1]; // Default to last death rate if not set
            
            const hd = Math.pow(1 + discountRate, -0.5);
            const v = Math.pow(1 + discountRate, -t);
            
            const pvfbta = Math.min(ts1, serviceCap) * pay * sif * hs * rgf;
            const pvfbaa = pvfbta * qd * v * hd;
            
            if (output === 1) {
                ALDResult += (pvfbaa * Math.min(ps, serviceCap)) / Math.max(1, Math.min(ts, serviceCap));
                NCDResult += pvfbaa / Math.max(1, Math.min(ts, serviceCap));
            } else {
                if (ts > serviceCap) {
                    ALDResult += 0;
                } else {
                    ALDResult += pvfbaa / Math.max(1, ts);
                }
            }
        }
    
        return {ALDResult, NCDResult};
    }
    
    calculateSIFandHS(monthsToSalaryInc: number, age: number, salaryIncreaseAssumptions: SalaryIncreaseAssumptions): { sif: number; hs: number } {
        let sif: number = 0;
        let hs: number = 0;
        const {
            SI,
            si1,
            si2,
            si3,
            si4,
            si5,
        }: SalaryIncreaseAssumptions = salaryIncreaseAssumptions;
    
        if (monthsToSalaryInc < 6) {
            switch (age) {
                case 0:
                    sif = 1 + si1;
                    hs = 1;
                    break;
                case 1:
                    sif = (1 + si1) * (1 + si2);
                    hs = 1;
                    break;
                case 2:
                    sif = (1 + si1) * (1 + si2) * (1 + si3);
                    hs = 1;
                    break;
                case 3:
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4);
                    hs = 1;
                    break;
                case 4:
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4) * (1 + si5);
                    hs = 1;
                    break;
                default:
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4) * (1 + si5) * Math.pow((1 + SI), (age - 4));
                    hs = 1;
            }
        } else if (monthsToSalaryInc === 6) {
            switch (age) {
                case 0:
                    sif = 1;
                    hs = Math.pow((1 + si1), 0.5);
                    break;
                case 1:
                    sif = (1 + si1);
                    hs = Math.pow((1 + si2), 0.5);
                    break;
                case 2:
                    sif = (1 + si1) * (1 + si2);
                    hs = Math.pow((1 + si3), 0.5);
                    break;
                case 3:
                    sif = (1 + si1) * (1 + si2) * (1 + si3);
                    hs = Math.pow((1 + si4), 0.5);
                    break;
                case 4:
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4);
                    hs = Math.pow((1 + si5), 0.5);
                    break;
                case 5:
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4) * (1 + si5);
                    hs = Math.pow((1 + SI), 0.5);
                    break;
                default:
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4) * (1 + si5) * Math.pow((1 + SI), (age - 5));
                    hs = Math.pow((1 + SI), 0.5);
            }
        } else { // monthsToSalaryInc > 6
            switch (age) {
                case 0:
                    sif = 1;
                    hs = 1;
                    break;
                case 1:
                    sif = (1 + si1);
                    hs = 1;
                    break;
                case 2:
                    sif = (1 + si1) * (1 + si2);
                    hs = 1;
                    break;
                case 3:
                    sif = (1 + si1) * (1 + si2) * (1 + si3);
                    hs = 1;
                    break;
                case 4:
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4);
                    hs = 1;
                    break;
                case 5:
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4) * (1 + si5);
                    hs = 1;
                    break;
                default:
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4) * (1 + si5) * Math.pow((1 + SI), (age - 5));
                    hs = 1;
            }
        }
    
        return { sif, hs };
    }

    getDecrementTableEntryByAge(age: number, decrementTable: DecrementTableEntry[]): DecrementTableEntry | undefined {
        return decrementTable.find(entry => entry.age === age);
    }
    
}