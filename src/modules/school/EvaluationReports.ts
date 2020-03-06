import MyLogger from '../MyLogger';
import MyDate from '../MyDate';
import AverageData, { IAverageDatum } from './AverageData';
import Suggestions from './Suggestions';
import SchoolMonthlyReport, { ClassReport } from './SchoolMonthlyReport';
import MakeReportHelper from './MakeReportHelper';
const Logger = MyLogger.getLogger();

/**
 * 広告評価データ IF
 * @interface IEvaluationReports
 */
export interface IEvaluationReports {
    [classCode: string]: IEvaluationReport;
}
/**
 * 広告評価データ 教室別 IF
 * @interface IEvaluationReport
 */
export interface IEvaluationReport {
    /**
     * 問い合わせ数 前年度対比
     * @type {number}
     * @memberof IEvaluationReport
     */
    inquiries_ratio_to_lastyear: number;
    /**
     * 問い合わせ数 都道府県平均対比
     * @type {number}
     * @memberof IEvaluationReport
     */
    inquiries_ratio_to_pref_average: number;
    /**
     * 問い合わせ数 全国平均対比
     * @type {number}
     * @memberof IEvaluationReport
     */
    inquiries_ratio_to_all_average: number;
    /**
     * ページ閲覧数 前年度対比
     * @type {number}
     * @memberof IEvaluationReport
     */
    sessions_ratio_to_lastyear: number;
    /**
     * ページ閲覧数 都道府県平均対比
     * @type {number}
     * @memberof IEvaluationReport
     */
    sessions_ratio_to_pref_average: number;
    /**
     * ページ閲覧数 全国平均対比
     * @type {number}
     * @memberof IEvaluationReport
     */
    sessions_ratio_to_all_average: number;
    /**
     * バナー表示回数 都道府県平均対比
     * @type {number}
     * @memberof IEvaluationReport
     */
    impressions_ratio_to_pref_average: number;
    /**
     * バナー表示回数 全国平均対比
     * @type {number}
     * @memberof IEvaluationReport
     */
    impressions_ratio_to_all_average: number;
    /**
     * バナークリック率 都道府県平均対比
     * @type {number}
     * @memberof IEvaluationReport
     */
    ctr_ratio_to_pref_average: number;
    /**
     * バナークリック率 全国平均対比
     * @type {number}
     * @memberof IEvaluationReport
     */
    ctr_ratio_to_all_average: number;
    /**
     * 示唆コメント
     * @type {string}
     * @memberof IEvaluationReport
     */
    suggestionText: string;
}

/**
 * 広告評価データ
 * @class EvaluationReports
 * @implements {IEvaluationReport}
 */
class EvaluationReports implements IEvaluationReports {
    [classCode: string]: IEvaluationReport;
    /**
     * Creates an instance of EvaluationReports.
     * @param {SchoolMonthlyReport} classReports - 教室別レポート
     * @param {AverageData} averageData - 平均データ
     * @param {Suggestions} suggestions - 示唆コメントデータ
     * @param {MyDate} fromDate - 集計開始日
     * @param {MyDate} toDate - 集計終了日
     * @memberof EvaluationReports
     */
    constructor(
        classReports: SchoolMonthlyReport,
        averageData: AverageData,
        suggestions: Suggestions,
        fromDate: MyDate,
        toDate: MyDate
    ) {
        classReports.classes.forEach(classReport => {
            if (!this[classReport.code]) {
                const averageData_prefecture = // prefecture が存在していない場合（オーナーレポート）は全国を使う
                    classReport.prefecture !== '' ? averageData[classReport.prefecture] : averageData['全国'];
                const averageData_all = averageData['全国'];
                this[classReport.code] = new EvaluationReport(
                    classReport,
                    averageData_prefecture,
                    averageData_all,
                    suggestions,
                    fromDate,
                    toDate
                );
            }
        });
    }
}
/**
 * 広告評価データ 教室別
 * @class EvaluationReport
 * @implements {IEvaluationReport}
 */
class EvaluationReport implements IEvaluationReport {
    inquiries_ratio_to_lastyear: number = 0;
    inquiries_ratio_to_pref_average: number = 0;
    inquiries_ratio_to_all_average: number = 0;
    sessions_ratio_to_lastyear: number = 0;
    sessions_ratio_to_pref_average: number = 0;
    sessions_ratio_to_all_average: number = 0;
    impressions_ratio_to_pref_average: number = 0;
    impressions_ratio_to_all_average: number = 0;
    ctr_ratio_to_pref_average: number = 0;
    ctr_ratio_to_all_average: number = 0;
    suggestionText: string = '';
    constructor(
        classReport: ClassReport,
        averageData_prefecture: IAverageDatum,
        averageData_all: IAverageDatum,
        suggestions: Suggestions,
        fromDate: MyDate,
        toDate: MyDate
    ) {
        // オーナーレポートでは classReport は複数の教室レポートの合計値のため、教室数分の減算係数を作成する
        // 教室レポートでは教室数１なのでそのまま１になる
        const coefficient = 1 / classReport.sumCount;

        // 年度合計の作成
        // 今年度
        const sumSubReport_thisyear = MakeReportHelper.sumSubReport(classReport, fromDate, toDate);
        // 前年度
        const sumSubReport_lastyear = MakeReportHelper.sumSubReport(
            classReport,
            new MyDate(fromDate.getFormattedString(`${toDate.getFullYear() - 1}-MM-DD`)),
            new MyDate(toDate.getFormattedString(`${toDate.getFullYear() - 1}-MM-DD`))
        );
        const ratio = (value_1: number, value_2: number = 0): number => {
            if (!Number.isFinite(value_1) || !Number.isFinite(value_2) || value_1 === 0 || value_2 === 0) {
                return 0;
            }
            return value_1 / value_2 - 1;
        };
        // 前年度対比
        this.inquiries_ratio_to_lastyear = ratio(sumSubReport_thisyear.inquiries, sumSubReport_lastyear.inquiries);
        this.sessions_ratio_to_lastyear = ratio(sumSubReport_thisyear.sessions, sumSubReport_lastyear.sessions);

        // 平均対比
        this.inquiries_ratio_to_pref_average = ratio(
            sumSubReport_thisyear.inquiries * coefficient,
            averageData_prefecture.inquiries
        );
        this.inquiries_ratio_to_all_average = ratio(
            sumSubReport_thisyear.inquiries * coefficient,
            averageData_all.inquiries
        );
        this.sessions_ratio_to_pref_average = ratio(
            sumSubReport_thisyear.sessions * coefficient,
            averageData_prefecture.sessions
        );
        this.sessions_ratio_to_all_average = ratio(
            sumSubReport_thisyear.sessions * coefficient,
            averageData_all.sessions
        );
        this.impressions_ratio_to_pref_average = ratio(
            sumSubReport_thisyear.impressions * coefficient,
            averageData_prefecture.impressions
        );
        this.impressions_ratio_to_all_average = ratio(
            sumSubReport_thisyear.impressions * coefficient,
            averageData_all.impressions
        );
        // クリック率はもともと割合計算なので係数はかけない
        this.ctr_ratio_to_pref_average = ratio(
            sumSubReport_thisyear.impressions > 0
                ? sumSubReport_thisyear.clicks / sumSubReport_thisyear.impressions
                : 0,
            averageData_prefecture.impressions > 0
                ? averageData_prefecture.clicks / averageData_prefecture.impressions
                : 0
        );
        this.ctr_ratio_to_all_average = ratio(
            sumSubReport_thisyear.impressions > 0
                ? sumSubReport_thisyear.clicks / sumSubReport_thisyear.impressions
                : 0,
            averageData_all.impressions > 0 ? averageData_all.clicks / averageData_all.impressions : 0
        );

        const pattern_inquiries = this.inquiries_ratio_to_pref_average > 0 ? 8 : 0;
        const pattern_sessions = this.sessions_ratio_to_pref_average > 0 ? 4 : 0;
        const pattern_impressions = this.impressions_ratio_to_pref_average > 0 ? 2 : 0;
        const pattern_ctr = this.ctr_ratio_to_pref_average > 0 ? 1 : 0;
        const patternID = pattern_inquiries + pattern_sessions + pattern_impressions + pattern_ctr;
        this.suggestionText = suggestions.getSuggestionText(patternID);
    }
}

export default EvaluationReports;
