// Type definitions for School Monthly Report
// TypeScript Version: 2.3

/**
 * 教室別レポート
 */
interface IClassReport {
    code: string;
    name: string;
    owner: string;
    supervisor: string;
    fileName: string;
    prefecture: string;
    inquiries: ISchoolReport[];
    sessions: ISchoolReport[];
    distributes: ISubReport[];
    creatives: ISubReport[];
    daily: ISubReport[];
    sumCount: number;
}

/**
 * School外部データレポート
 */
interface ISchoolReport {
    key: string;
    [s: string]: any;
}

/**
 * 配信レポート, クリエイティブ別レポート, 日別レポート
 */
interface ISubReport {
    key: string;
    impressions: number;
    clicks: number;
    extraField_1: number; // 拡張項目（配信レポートの市区町村からのセッション数で利用中）
    extraField_2: number; // 拡張項目（未使用）
    extraField_3: number; // 拡張項目（未使用）
}

/**
 * School月次レポート生レポートデータ
 */
export interface ISchoolMonthlyReport {
    classes: IClassReport[];
}
