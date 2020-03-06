import MyLogger from '../MyLogger';
import MyDate from '../MyDate';
import SchoolMonthlyReport, { ClassReport, SubReport, SchoolReport } from './SchoolMonthlyReport';
import { IEvaluationReport } from './EvaluationReports';
const Logger = MyLogger.getLogger();

/**
 *  School提供のデータ（外部データ）クラス
 */
export default class OutputReportHelper {
    /**
     * レポートエクセルシートの作成 School提供データ（外部データ）
     * @param {Object} sheet - データを書き出す対象のエクセルシート (xlsx-populate.worksheet)
     * @param {SchoolReport[]} reports - 月次レポートオブジェクトのSchool外部データ
     * @param {String} fieldsString - 描画するデータ項目の要素名の配列
     * @param {number} startRowNumber - 描画開始位置 行
     * @param {number} startColumnNumber_label - 描画開始位置 縦列 ラベル
     * @param {number} startColumnNumber_data - 描画開始位置 縦列 データ
     * @returns {number} - 最終描画位置行数
     * @static
     */
    static schoolData(
        sheet: any,
        reports: SchoolReport[],
        fieldsString: string,
        startRowNumber: number,
        startColumnNumber_label: number,
        startColumnNumber_data: number
    ): number {
        const fields = fieldsString.split(',');

        let currentRowNumber = startRowNumber;
        // 1行目 今年分初月
        sheet.cell(currentRowNumber, startColumnNumber_label).value(reports[0].key);
        for (const index in fields) {
            if (typeof reports[0] !== 'undefined' && typeof reports[0][fields[index]] !== 'undefined') {
                sheet.cell(currentRowNumber, startColumnNumber_data + parseInt(index)).value(reports[0][fields[index]]);
            }
        }
        currentRowNumber++;
        // 2行目 前年分初月
        sheet.cell(currentRowNumber, startColumnNumber_label).value(reports[1].key);
        for (const index in fields) {
            if (typeof reports[1] !== 'undefined' && typeof reports[1][fields[index]] !== 'undefined') {
                sheet.cell(currentRowNumber, startColumnNumber_data + parseInt(index)).value(reports[1][fields[index]]);
            }
        }
        currentRowNumber++;
        currentRowNumber++;
        // 3行目 今年分次月
        sheet.cell(currentRowNumber, startColumnNumber_label).value(reports[2].key);
        for (const index in fields) {
            if (typeof reports[2] !== 'undefined' && typeof reports[2][fields[index]] !== 'undefined') {
                sheet.cell(currentRowNumber, startColumnNumber_data + parseInt(index)).value(reports[2][fields[index]]);
            }
        }
        currentRowNumber++;
        // 4行目 前年分次月
        sheet.cell(currentRowNumber, startColumnNumber_label).value(reports[3].key);
        for (const index in fields) {
            if (typeof reports[3] !== 'undefined' && typeof reports[3][fields[index]] !== 'undefined') {
                sheet.cell(currentRowNumber, startColumnNumber_data + parseInt(index)).value(reports[3][fields[index]]);
            }
        }
        currentRowNumber++;
        currentRowNumber++;

        // 今年-前年分比較ラベル（計算はシート内式）
        const parseDateFromMonth = (monthString: string): MyDate => {
            const year = monthString.split(/年/)[0];
            const month = monthString.split(/年/)[1].replace(/月/, '');
            return new MyDate(`${year}/${month}/15`);
        };
        const tmpDateString_range_1 =
            parseDateFromMonth(reports[0].key).getFormattedString('YYYY年M') +
            '-' +
            parseDateFromMonth(reports[2].key).getFormattedString('M月');
        const tmpDateString_range_2 =
            parseDateFromMonth(reports[1].key).getFormattedString('YYYY年M') +
            '-' +
            parseDateFromMonth(reports[3].key).getFormattedString('M月');

        sheet.cell(currentRowNumber, startColumnNumber_label).value(tmpDateString_range_1);
        currentRowNumber++;
        sheet.cell(currentRowNumber, startColumnNumber_label).value(tmpDateString_range_2);

        return currentRowNumber;
    }

    /**
     * レポートエクセルシートの作成 媒体の月別集計データ
     * @param {Object} sheet - データを書き出す対象のエクセルシート (xlsx-populate.worksheet)
     * @param {SubReport[]} reports - 月次レポートオブジェクトの配信実績データ
     * @param {number} startRowNumber - 描画開始位置 行
     * @param {number} startColumnNumber - 描画開始位置 縦列
     * @returns {number} - 最終描画位置行数
     * @static
     */
    static mediumMonthTotal(
        sheet: any,
        reports: SubReport[],
        startRowNumber: number,
        startColumnNumber: number
    ): number {
        let currentRowNumber = startRowNumber;

        sheet.cell(currentRowNumber, startColumnNumber).value('■広告配信実績');
        currentRowNumber++;
        sheet.cell(currentRowNumber, startColumnNumber + 0).value(' ');
        sheet.cell(currentRowNumber, startColumnNumber + 1).value('表示回数');
        sheet.cell(currentRowNumber, startColumnNumber + 2).value('クリック数');
        sheet.cell(currentRowNumber, startColumnNumber + 3).value('クリック率');
        sheet.cell(currentRowNumber, startColumnNumber + 4).value('市区町村からのセッション');
        currentRowNumber++;

        reports.forEach((report, index) => {
            sheet.cell(currentRowNumber + index, startColumnNumber + 0).value(report.key);
            sheet.cell(currentRowNumber + index, startColumnNumber + 1).value(report.impressions);
            sheet.cell(currentRowNumber + index, startColumnNumber + 2).value(report.clicks);
            sheet
                .cell(currentRowNumber + index, startColumnNumber + 3)
                .value(report.impressions ? report.clicks / report.impressions : 0); // prevent divide by zero
            sheet.cell(currentRowNumber + index, startColumnNumber + 3).style('numberFormat', '0.0%');
            sheet.cell(currentRowNumber + index, startColumnNumber + 4).value(report.extraField_1);
        });
        sheet.cell(currentRowNumber + reports.length - 1, startColumnNumber + 3).style({
            fill: {
                type: 'solid',
                color: 'FFF2CC',
            },
            numberFormat: '0.0%',
        });
        currentRowNumber = currentRowNumber + reports.length;

        return currentRowNumber;
    }

    /**
     * レポートエクセルシートの作成 adService データ -
     * 集計に於いては媒体の imp/click 合計値に合わせ、正しい比率に応じて数値を自動調整する
     * @param {Object} sheet - データを書き出す対象のエクセルシート (xlsx-populate.worksheet)
     * @param {SubReport[]} reports - 月次レポートオブジェクトのクリエイティブ別データ
     * @param {number} startRowNumber - 描画開始位置 行
     * @param {number} startColumnNumber - 描画開始位置 縦列
     * @returns {number} - 最終描画位置行数
     * @static
     */
    static adServiceData(sheet: any, reports: SubReport[], startRowNumber: number, startColumnNumber: number): number {
        let currentRowNumber = startRowNumber;
        sheet.cell(currentRowNumber, startColumnNumber).value('■広告配信実績');
        currentRowNumber++;
        sheet.cell(currentRowNumber, startColumnNumber + 0).value(' ');
        sheet.cell(currentRowNumber, startColumnNumber + 1).value('表示回数');
        sheet.cell(currentRowNumber, startColumnNumber + 2).value('クリック数');
        sheet.cell(currentRowNumber, startColumnNumber + 3).value('クリック率');
        currentRowNumber++;

        reports.forEach((report, index) => {
            sheet.cell(currentRowNumber + index, startColumnNumber + 0).value(report.key);
            sheet.cell(currentRowNumber + index, startColumnNumber + 1).value(report.impressions);
            sheet.cell(currentRowNumber + index, startColumnNumber + 2).value(report.clicks);
            sheet
                .cell(currentRowNumber + index, startColumnNumber + 3)
                .value(report.impressions ? report.clicks / report.impressions : 0); // prevent divide by zero
            sheet.cell(currentRowNumber + index, startColumnNumber + 3).style('numberFormat', '0.0%');
        });
        sheet.cell(currentRowNumber + reports.length - 1, startColumnNumber + 3).style({
            fill: {
                type: 'solid',
                color: 'FFF2CC',
            },
            numberFormat: '0.0%',
        });
        currentRowNumber = currentRowNumber + reports.length;

        return currentRowNumber;
    }

    /**
     * レポートエクセルシートの作成 媒体データ 日次
     * @param {Object} sheet - データを書き出す対象のエクセルシート (xlsx-populate.worksheet)
     * @param {SubReport[]} reports - 月次レポートオブジェクトの日別データ
     * @param {number} startRowNumber - 描画開始位置 行
     * @param {number} startColumnNumber - 描画開始位置 縦列
     * @returns {number} - 最終描画位置行数
     * @static
     */
    static mediaData(sheet: any, reports: SubReport[], startRowNumber: number, startColumnNumber: number): number {
        let currentRowNumber = startRowNumber;
        sheet.cell(currentRowNumber, startColumnNumber).value('■広告日別実績');
        currentRowNumber++;
        sheet.cell(currentRowNumber, startColumnNumber + 0).value('日');
        sheet.cell(currentRowNumber, startColumnNumber + 1).value('曜日');
        sheet.cell(currentRowNumber, startColumnNumber + 2).value('表示回数');
        sheet.cell(currentRowNumber, startColumnNumber + 3).value('クリック数');
        currentRowNumber++;

        reports.forEach((report, index) => {
            const loopDate = new MyDate(report.key);
            if (loopDate.toString() !== 'Invalid Date') {
                sheet
                    .cell(currentRowNumber + index, startColumnNumber + 0)
                    .value(loopDate.getFormattedString('YYYY/MM/DD'));
                sheet.cell(currentRowNumber + index, startColumnNumber + 1).value(loopDate.getWeekdayString());
            } else {
                sheet.cell(currentRowNumber + index, startColumnNumber + 0).value(report.key);
            }
            sheet.cell(currentRowNumber + index, startColumnNumber + 2).value(report.impressions);
            sheet.cell(currentRowNumber + index, startColumnNumber + 3).value(report.clicks);
        });
        sheet.cell(currentRowNumber + reports.length - 1, startColumnNumber + 1).value(' '); // シートの見栄えのため最終行（合計）の曜日欄に空白を入れる

        return currentRowNumber;
    }

    /**
     * レポートエクセルシートの作成 広告評価レポート
     * @static
     * @param {*} sheet - データを書き出す対象のエクセルシート (xlsx-populate.worksheet)
     * @param {IEvaluationReport} eveluationReport - 広告評価レポート
     * @param {number} startRowNumber - 描画開始位置 行
     * @param {number} startColumnNumber - 描画開始位置 縦列
     * @param {boolean} [enable_prefecture=true] - 都道府県平均対比を出力するかどうか
     * @param {boolean} [enable_suggest=true] - 全教室平均対比を出力するかどうか
     * @returns {number} - 最終描画位置行数
     * @memberof OutputReportHelper
     */
    static evaluationReport(
        sheet: any,
        eveluationReport: IEvaluationReport,
        startRowNumber: number,
        startColumnNumber: number,
        enable_prefecture: boolean = true,
        enable_suggest: boolean = true
    ): number {
        // 都道府県平均対比、示唆コメントが無効の場合は「-」文字にする（示唆コメントは空白）
        const inquiries_ratio_to_pref_average = enable_prefecture
            ? eveluationReport.inquiries_ratio_to_pref_average
            : '-';
        const sessions_ratio_to_pref_average = enable_prefecture
            ? eveluationReport.sessions_ratio_to_pref_average
            : '-';
        const impressions_ratio_to_pref_average = enable_prefecture
            ? eveluationReport.impressions_ratio_to_pref_average
            : '-';
        const ctr_ratio_to_pref_average = enable_prefecture ? eveluationReport.ctr_ratio_to_pref_average : '-';
        const suggestionText = enable_suggest ? eveluationReport.suggestionText : '';

        let currentRowNumber = startRowNumber;
        sheet.cell(currentRowNumber, startColumnNumber + 0).value(eveluationReport.inquiries_ratio_to_lastyear);
        sheet.cell(currentRowNumber, startColumnNumber + 1).value(inquiries_ratio_to_pref_average);
        sheet.cell(currentRowNumber, startColumnNumber + 2).value(eveluationReport.inquiries_ratio_to_all_average);
        sheet.cell(currentRowNumber, startColumnNumber + 3).value(suggestionText);

        currentRowNumber++;
        sheet.cell(currentRowNumber, startColumnNumber + 0).value(eveluationReport.sessions_ratio_to_lastyear);
        sheet.cell(currentRowNumber, startColumnNumber + 1).value(sessions_ratio_to_pref_average);
        sheet.cell(currentRowNumber, startColumnNumber + 2).value(eveluationReport.sessions_ratio_to_all_average);

        currentRowNumber++;
        sheet.cell(currentRowNumber, startColumnNumber + 1).value(impressions_ratio_to_pref_average);
        sheet.cell(currentRowNumber, startColumnNumber + 2).value(eveluationReport.impressions_ratio_to_all_average);

        currentRowNumber++;
        sheet.cell(currentRowNumber, startColumnNumber + 1).value(ctr_ratio_to_pref_average);
        sheet.cell(currentRowNumber, startColumnNumber + 2).value(eveluationReport.ctr_ratio_to_all_average);

        currentRowNumber++;
        return currentRowNumber;
    }
}
