import { Injectable } from "@nestjs/common";
import { DecrementTableEntry, SalaryIncreaseAssumptions } from "../interfaces";
import { CalculationResult } from "../interfaces/gratuity-valuation-results.interface";

@Injectable()
export class GratuityCalculationsService {

    AL(
        age: number,
        ps: number,
        pay: number,
        discountRate: number,
        salaryIncreaseAssumptions: SalaryIncreaseAssumptions,
        output: number,
        decrementTable: DecrementTableEntry[],
        benefitType: string,
        serviceCap: number,
        serviceType: number,
        monthsToSalaryInc: number,
        retAge: number,
        benifitStructureFactors: { begin: number[], end: number[], death: number[], retirement: [], withdrawl: [], illHealth: [], termination: [] },
        scenario: 'withdrawl' | 'termination' | 'death' | 'retirement' | 'illHealth'
    ): any {
        let ALResult = 0;
        let NCResult = 0;
        let results: CalculationResult[] = [];
        let iterationResult: any;
        try {
            for (let t = 0; t <= (retAge - age - 1); t++) {
                iterationResult = {};
                iterationResult['t'] = t;
                const ts = ps + 0.5 + t;
                iterationResult['ts'] = ts;
                const pa = age + t;
                iterationResult['pa'] = pa;
                const qpa = this.getDecrementTableEntryByAge(pa, decrementTable);
                const qage = this.getDecrementTableEntryByAge(age, decrementTable);
                const qpaIndex = scenario === 'death' ? 'DD' : scenario === 'retirement' ? 'DR' : scenario === 'withdrawl' ? 'DW' : scenario === 'illHealth' ? 'DI' : 'DD'
                const q = (qpa?.[qpaIndex] / qage?.LX) ?? 0;
                iterationResult[qpaIndex] = qpa?.[qpaIndex];
                iterationResult['LX'] = qage?.LX;
                iterationResult['q'] = q;
    
                // const q = decrementTable[`dec${pa - 16}8`] / decrementTable[`dec${age - 16}6`];
                
                // let sif = 1;
                // let hs = 1;
                const {sif, hs} = this.calculateSIFandHS(monthsToSalaryInc, t, salaryIncreaseAssumptions);
                // Simplified logic for sif and hs calculations
                // This part should be expanded to accurately reflect your specific logic
                // based on monthsToSalaryInc and other variables
                iterationResult['sif'] = sif;
                iterationResult['hs'] = hs;
                
                let ts1;
                if (Number(serviceType) === 1) {
                    ts1 = ts;
                } else if (Number(serviceType) === 2) {
                    ts1 = Math.round(ts);
                } else {
                    ts1 = Math.floor(ts); // Assuming this as the equivalent of RoundDown
                }
    
                iterationResult['ts1'] = ts1;
                
                let rgf = 0;
                if (benefitType === 'fixed') {
                    // Determine rgf based on ts falling within begin and end ranges
                    for (let i = 0; i < benifitStructureFactors.begin.length; i++) {
                        if (ts >= benifitStructureFactors.begin[i] && ts < benifitStructureFactors.end[i]) {
                            rgf = benifitStructureFactors[scenario][i];
                            break;
                        }
                    }
                    if (rgf === 0) rgf = benifitStructureFactors[scenario][benifitStructureFactors[scenario].length - 1]; // Default to last death rate if not set
        
                } else if (benefitType === 'step-rated') {
    
                    // To calculate rgf for step-rated
                    rgf = this.calculateStepRatedrgf(pa, [benifitStructureFactors.begin[0], ...benifitStructureFactors.end], benifitStructureFactors[scenario]);
                } else if (benefitType === 'ksa-rated') {
                    rgf = this.calculateKSARatedrgf(pa, scenario);
                }
    
                iterationResult['rgf'] = rgf;
                
                const hd = Math.pow(1 + discountRate, -0.5);
                const v = Math.pow(1 + discountRate, -t);
                iterationResult['hd'] = hd;
                iterationResult['v'] = v;
    
                const pvfbta = Math.min(ts1, serviceCap) * pay * sif * hs * rgf;
                let expectedBenifit = pvfbta * q;
                const pvfbaa = pvfbta * q * v * hd;
                iterationResult['pvfbta'] = pvfbta;
                iterationResult['expectedBenifit'] = expectedBenifit;
                iterationResult['pvfbaa'] = pvfbaa;
                
                if (output === 1) {
                    ALResult += (pvfbaa * Math.min(ps, serviceCap)) / Math.max(1, Math.min(ts, serviceCap));
                    NCResult += pvfbaa / Math.max(1, Math.min(ts, serviceCap));
                } else {
                    if (ts > serviceCap) {
                        ALResult += 0;
                    } else {
                        ALResult += pvfbaa / Math.max(1, ts);
                    }
                }
                iterationResult['AL'] = ALResult;
                iterationResult['NC'] = NCResult;
                results.push(iterationResult);
            }
        } catch (error) {
            console.log(error)
        }
    
        return {results: results, AL: ALResult, NC: NCResult};
    }

    ALR(
        age: number, 
        ps: number, 
        pay: number, 
        discountRate: number, 
        salaryIncreaseAssumptions: SalaryIncreaseAssumptions, 
        output: number,
        decrementTable: DecrementTableEntry[],
        benefitType: string,
        serviceCap: number,
        serviceType: number,
        monthsToSalaryInc: number,
        retAge: number,
        benifitStructureFactors: { begin: number[], end: number[], death: number[], retirement: [], withdrawl: [], illHealth: [], termination: [] }
    ): any {

        let iterationResult: any = {};

        let ALRResult = 0;
        let NCRResult = 0;
        const {
            SI,
            si1,
            si2,
            si3,
            si4,
            si5,
        }: SalaryIncreaseAssumptions = salaryIncreaseAssumptions;
        let Future_service = retAge - age;
        iterationResult['futureService'] = Future_service;
        let sif = 1; // Default value
        // Calculate sif based on Future_service
        if (Future_service === 1) {
            sif = 1 + si1;
        } else if (Future_service === 2) {
            sif = (1 + si1) * (1 + si2);
        } else if (Future_service === 3) {
            sif = (1 + si1) * (1 + si2) * (1 + si3);
        } else if (Future_service === 4) {
            sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4);}
        else if (Future_service === 5) {
            sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4) * (1 + si5);
        } else if (Future_service > 5) {
            let multipliers = [si1, si2, si3, si4, si5, SI];
            sif = multipliers.slice(0, Future_service).reduce((acc, curr) => acc * (1 + curr), 1);
            if (Future_service > 5) {
                sif *= Math.pow(1 + SI, Future_service - 6);
            }
        }

        const { hs } = this.calculateSIFandHS(monthsToSalaryInc, Future_service, salaryIncreaseAssumptions);
        // hs not using in case of retirement

        iterationResult['sif'] = sif;
    
        let ts = ps + Future_service;
        iterationResult['ts'] = ts;
        let ts1 = Number(serviceType) === 1 ? ts : Number(serviceType) === 2 ? Math.round(ts) : Math.floor(ts);
        iterationResult['ts1'] = ts1;
        // Assume dec function provides a discount factor, simplified here
        // let qr = 1; // Simplification for example
        const qpa = this.getDecrementTableEntryByAge(retAge, decrementTable);
        const qage = this.getDecrementTableEntryByAge(age, decrementTable);
        
        const qr = (qpa?.DR / qage?.LX) ?? 0;
        iterationResult['qr'] = qr;
        let rgf = 0;
        // Determine rgf based on ts using benifitStructureFactors
        for (let i = 0; i < benifitStructureFactors.begin.length; i++) {
            if (ts >= benifitStructureFactors.begin[i] && ts < benifitStructureFactors.end[i]) {
                rgf = i === 0 ? 0.5 * ts1 : benifitStructureFactors.retirement[i] * (ts1 - (benifitStructureFactors.end[i - 1] || 0));
                break;
            }
        }
        if (rgf === 0) rgf = benifitStructureFactors.retirement[benifitStructureFactors.retirement.length - 1];
        const scenario = 'retirement';
        if (benefitType === 'fixed') {
            // Determine rgf based on ts falling within begin and end ranges
            for (let i = 0; i < benifitStructureFactors.begin.length; i++) {
                if (ts >= benifitStructureFactors.begin[i] && ts < benifitStructureFactors.end[i]) {
                    rgf = benifitStructureFactors[scenario][i];
                    break;
                }
            }
            if (rgf === 0) rgf = benifitStructureFactors[scenario][benifitStructureFactors[scenario].length - 1]; // Default to last death rate if not set

        } else if (benefitType === 'step-rated') {

            // To calculate rgf for step-rated
            rgf = this.calculateStepRatedrgf(ts, [benifitStructureFactors.begin[0], ...benifitStructureFactors.end], benifitStructureFactors[scenario]);
        } else if (benefitType === 'ksa-rated') {
            rgf = this.calculateKSARatedrgf(ts, scenario);
        }

        iterationResult['rgf'] = rgf;
    
        let v = Math.pow(1 + discountRate, -Future_service);
        iterationResult['v'] = v;
        let pvfbta = Math.min(ts1, serviceCap) * pay * sif * rgf;
        iterationResult['pvfbta'] = pvfbta;

        let expectedBenifit = pvfbta * qr;
        iterationResult['expectedBenifit'] = expectedBenifit;

        let pvfbaa = pvfbta * qr * v;
        iterationResult['pvfbaa'] = pvfbaa;
/*  
        return output === 1 
            ? (pvfbaa * Math.min(ps, benifitStructureFactors.end[benifitStructureFactors.end.length - 1]) / Math.max(1, ts))
            : (ps > benifitStructureFactors.end[benifitStructureFactors.end.length - 1] ? 0 : (pvfbaa / Math.max(1, ts)));
*/
        if (output === 1) {
            ALRResult += (pvfbaa * Math.min(ps, benifitStructureFactors.end[benifitStructureFactors.end.length - 1]) / Math.max(1, ts));
            NCRResult += (pvfbaa  / Math.max(1, ts));
            iterationResult['AL'] = ALRResult;
            iterationResult['NC'] = NCRResult;
        } else {
            if (ts > serviceCap) {
                ALRResult += 0;
            } else {
                ALRResult += pvfbaa / Math.max(1, ts);
            }
        }

        return {results: [iterationResult], AL: ALRResult, NC: NCRResult};
    }
    
    calculateSIFandHS(monthsToSalaryInc: number, t: number, salaryIncreaseAssumptions: SalaryIncreaseAssumptions): { sif: number; hs: number } {
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
            switch (t) {
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
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4) * (1 + si5) * Math.pow((1 + SI), (t - 4));
                    hs = 1;
            }
        } else if (monthsToSalaryInc >= 6) {
            switch (t) {
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
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4) * (1 + si5) * Math.pow((1 + SI), (t - 5));
                    hs = Math.pow((1 + SI), 0.5);
            }
        }/* else { // monthsToSalaryInc > 6
            switch (t) {
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
                    sif = (1 + si1) * (1 + si2) * (1 + si3) * (1 + si4) * (1 + si5) * Math.pow((1 + SI), (t - 5));
                    hs = 1;
            }
        }*/
    
        return { sif, hs };
    }

    getDecrementTableEntryByAge(age: number, decrementTable: DecrementTableEntry[]): DecrementTableEntry | undefined {
        return decrementTable.find(entry => entry.age === age);
    }

    calculateStepRatedrgf(ps: number, ageBrackets: number[], percentages: number[]): number {
        let rgf = 0;
    
        let remainingAge = ps;
    
        for (let i = 0; i < ageBrackets.length - 1; i++) {
            if (remainingAge > 0) {
                // Calculate the duration spent in the current age bracket
                const bracketDuration = Math.min(ageBrackets[i + 1], ps) - ageBrackets[i];
                // Ensure we don't account for negative durations (in case age < the start of the first bracket)
                const effectiveDuration = Math.max(0, bracketDuration);
                // Calculate the proportional contribution of this bracket's duration to the total age
                const contribution = (percentages[i] * effectiveDuration * 100) / ps;
                rgf += contribution;
    
                // Reduce the remaining age by the duration spent in this bracket
                remainingAge -= bracketDuration;
    
                // Update the age to reflect the remaining age for subsequent iterations
                ps -= effectiveDuration;
            } else {
                break; // Exit loop if there's no remaining age to account for
            }
        }
    
        return rgf/100;
    }

    calculateKSARatedrgf(ps: number, scenario: 'withdrawl' | 'termination' | 'death' | 'retirement' | 'illHealth'): number {
        let benefit = 0;
        if (scenario === 'withdrawl') {
            if (ps > 2 && ps <= 5) {
                benefit = (1 / 2) / 3 * ps;
            } else if (ps > 5 && ps <= 10) {
                benefit = (1 / 3) * 5 + (1 * 2 / 3) * (ps - 5);
            } else if (ps > 10) {
                benefit = (1 / 2) * 5 + 1 * (ps - 5);
            }
        } else if (scenario === 'termination' || scenario === 'death' || scenario === 'retirement' || scenario === 'illHealth') {
            if (ps <= 5) {
                benefit = (1 / 2) * ps;
            } else {
                benefit = (1 / 2) * 5 + 1 * (ps - 5);
            }
        }
        return benefit/100;
    }
    
}