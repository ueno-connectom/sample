import MyLogger from '../MyLogger';
import MyDate from '../MyDate';
import ClassInfo from './ClassInfo';
import SchoolMonthlyReport from './SchoolMonthlyReport';
import MakeReportHelper from './MakeReportHelper';
const Logger = MyLogger.getLogger();

/**
 * 平均データ
 * @interface IAverageData
 */
export interface IAverageData {
    [prefecture: string]: IAverageDatum;
}
export interface IAverageDatum {
    impressions: number;
    clicks: number;
    inquiries: number;
    sessions: number;
    ctr: number;
}

/**
 * 集計用データ集合
 * @interface IAggregatedDataByPrefecture
 */
interface IAggregatedDataByPrefecture {
    [prefecture: string]: IAggregatedDatum | Function;
    add(prefecture: string, impressions: number, clicks: number, inquiries: number, sessions: number): void;
}
interface IAggregatedDatum {
    impressions_array: number[]; // Array なのは明白だけど平均値の項と区別のため _array と付記
    clicks_array: number[];
    inquiries_array: number[];
    sessions_array: number[];
    add(impressions: number, clicks: number, inquiries: number, sessions: number): void;
}

/**
 * 平均データ（単エリア）
 * @class AverageDatum
 * @implements {AverageDatum}
 */
class AverageDatum implements IAverageDatum {
    impressions: number;
    clicks: number;
    inquiries: number;
    sessions: number;
    ctr: number;
    constructor(
        impressions: number = 0,
        clicks: number = 0,
        inquiries: number = 0,
        sessions: number = 0,
        ctr: number = 0
    ) {
        this.impressions = impressions;
        this.clicks = clicks;
        this.inquiries = inquiries;
        this.sessions = sessions;
        this.ctr = ctr;
    }
}

/**
 * 平均データ（全エリア集合）
 * 都道府県別ｘ教室のデータを作成し、平均を取る
 * @class AverageData
 * @implements {AverageData}
 */
class AverageData implements IAverageData {
    [prefecture: string]: IAverageDatum;
    /**
     * 集計用データ
     * @static
     * @memberof AverageData
     */
    public static AggregatedDataByPrefecture = class implements IAggregatedDataByPrefecture {
        [prefecture: string]: IAggregatedDatum | any;
        public add(prefecture: string, impressions: number, clicks: number, inquiries: number, sessions: number) {
            if (this[prefecture]) {
                this[prefecture].add(impressions, clicks, inquiries, sessions);
            } else {
                this[prefecture] = new AverageData.AggregatedDatum(impressions, clicks, inquiries, sessions);
            }
        }
    };

    public static AggregatedDatum = class implements IAggregatedDatum {
        impressions_array: number[];
        clicks_array: number[];
        inquiries_array: number[];
        sessions_array: number[];
        constructor(impressions: number = 0, clicks: number = 0, inquiries: number = 0, sessions: number = 0) {
            this.impressions_array = [impressions];
            this.clicks_array = [clicks];
            this.inquiries_array = [inquiries];
            this.sessions_array = [sessions];
        }
        public add(impressions: number, clicks: number, inquiries: number, sessions: number) {
            this.impressions_array.push(impressions);
            this.clicks_array.push(clicks);
            this.inquiries_array.push(inquiries);
            this.sessions_array.push(sessions);
        }
    };

    /**
     * Creates an instance of AverageData.
     * @param {ClassInfo} classInfo - 教室情報（都道府県一覧生成用）
     * @param {SchoolMonthlyReport} reports - レポートデータ
     * @param {MyDate} fromDate - 集計開始日
     * @param {MyDate} toDate - 集計終了日
     * @memberof AverageData
     */
    constructor(classInfo: ClassInfo, reports: SchoolMonthlyReport, fromDate: MyDate, toDate: MyDate) {
        // 都道府県一覧 + 全国リスト
        const prefectures_bare: string[] = [];
        classInfo.data.forEach(classInfoDatum => prefectures_bare.push(classInfoDatum.prefecture));
        const prefectures = [...new Set(prefectures_bare)];
        prefectures.push('全国');

        // オブジェクト準備
        prefectures.forEach(prefecture => {
            this[prefecture] = new AverageDatum();
        });
        const aggregatedDataByPrefecture = new AverageData.AggregatedDataByPrefecture();

        // 各都道府県別データ収集
        reports.classes.map(report => {
            // 教室ごとに月ごとの集計データがあり、それらをまとめるためのサブ集計
            const subReport_sum = MakeReportHelper.sumSubReport(report, fromDate, toDate);

            // 都道府県別に教室ごとのデータ作成
            aggregatedDataByPrefecture.add(
                report.prefecture,
                subReport_sum.impressions,
                subReport_sum.clicks,
                subReport_sum.inquiries,
                subReport_sum.sessions
            );
            aggregatedDataByPrefecture.add(
                '全国',
                subReport_sum.impressions,
                subReport_sum.clicks,
                subReport_sum.inquiries,
                subReport_sum.sessions
            );
        });

        // 平均データ作成
        const sum = (array: number[]) => array.reduce((acc: number, cur: number) => acc + cur);
        const average = (array: number[]) => sum(array) / array.length;
        prefectures.forEach(prefecture => {
            this[prefecture].impressions = average(aggregatedDataByPrefecture[prefecture].impressions_array);
            this[prefecture].clicks = average(aggregatedDataByPrefecture[prefecture].clicks_array);
            this[prefecture].inquiries = average(aggregatedDataByPrefecture[prefecture].inquiries_array);
            this[prefecture].sessions = average(aggregatedDataByPrefecture[prefecture].sessions_array);
            this[prefecture].ctr = this[prefecture].clicks / this[prefecture].impressions;
        });

        Logger.trace(`Aggregate By Prefecture: ${JSON.stringify(aggregatedDataByPrefecture)}`);
    }
}

export default AverageData;
