import ISchoolMonthlyReport from './types/SchoolMonthlyReport.d';

export class ClassReport implements ISchoolMonthlyReport.IClassReport {
    public code: string = '';
    public name: string = '';
    public owner: string = '';
    public supervisor: string = '';
    public fileName: string = '';
    public prefecture: string = '';
    public inquiries: SchoolReport[] = [];
    public sessions: SchoolReport[] = [];
    public distributes: SubReport[] = [];
    public creatives: SubReport[] = [];
    public daily: SubReport[] = [];
    public sumCount: number = 1;

    public constructor(
        code: string = '',
        name: string = '',
        owner: string = '',
        supervisor: string = '',
        fileName: string = '',
        prefecture: string = '',
        sumCount: number = 1
    ) {
        this.code = code;
        this.name = name;
        this.owner = owner;
        this.supervisor = supervisor;
        this.fileName = fileName;
        this.prefecture = prefecture;
        this.sumCount = sumCount;
    }
}
export class SchoolReport implements ISchoolMonthlyReport.ISchoolReport {
    public key: string;
    [s: string]: any;

    public constructor(key: string = '', ...args: any[]) {
        this.key = key;
        args.forEach(arg => (this[arg] = arg));
    }
}
export class SubReport implements ISchoolMonthlyReport.ISubReport {
    public key: string;
    public impressions: number;
    public clicks: number;
    public extraField_1: number;
    public extraField_2: number;
    public extraField_3: number;

    public constructor(
        key: string = '',
        impressions: number = 0,
        clicks: number = 0,
        extraField_1: number = 0,
        extraField_2: number = 0,
        extraField_3: number = 0
    ) {
        this.key = key;
        this.impressions = impressions;
        this.clicks = clicks;
        this.extraField_1 = extraField_1;
        this.extraField_2 = extraField_2;
        this.extraField_3 = extraField_3;
    }
}

export default class SchoolMonthlyReport implements ISchoolMonthlyReport.ISchoolMonthlyReport {
    public classes: ClassReport[] = [];
}
