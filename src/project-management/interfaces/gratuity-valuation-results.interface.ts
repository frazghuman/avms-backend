// Base interface for common properties
export interface CalculationResultBase {
    t: number;
    ts: number;
    pa: number;
    q: number;
    sif: number;
    hs: number;
    ts1: number;
    rgf: number;
    hd: number;
    v: number;
    pvfbta: number;
    pvfbaa: number;
    AL: number;
    NC: number;
  }
  
  // Extended interfaces for each category with their unique properties
export interface DeathCalculationResult extends CalculationResultBase {
    DD: number;
  }
  
export interface WithdrawalCalculationResult extends CalculationResultBase {
    DW: number;
  }
  
export interface IllHealthCalculationResult extends CalculationResultBase {
    DI: number;
  }
  
export interface RetirementCalculationResult extends CalculationResultBase {
    DR: number;
  }
  
  // Union type for all calculation results
export type CalculationResult = DeathCalculationResult | WithdrawalCalculationResult | IllHealthCalculationResult | RetirementCalculationResult;
  
  // Adjust the CalculationCategory to use the generic CalculationResult
export interface CalculationCategory {
    results: CalculationResult[];
    AL: number;
    NC: number;
  }
  
  // The rest remains unchanged
export interface ALDetails {
    death: CalculationCategory;
    withdrawl: CalculationCategory;
    illHealth: CalculationCategory;
    retirement: CalculationCategory; // Assuming you need similar structure for retirement calculations
  }
  
export interface EmployeeDetails {
    "Sr.No.": number;
    EmployeeID: number;
    Name: string;
    Designation: string;
    DateofAppointmnet: number;
    DateofBirth: number;
    Pay: number;
    Age: number;
    PastService: number;
    Split: string;
    PayLastYear: number;
    AgeLastYear: number;
    PastServiceLastYear: number;
    AL: ALDetails;
  }
  