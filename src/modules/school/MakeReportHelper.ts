import MyUtil from '../MyUtil';
import MyLogger from '../MyLogger';
import SchoolData from './SchoolData';
import MyDate from '../MyDate';
import ClassInfo from './ClassInfo';
import AdServiceData from './adServiceData';
import MediumData from './MediumData';
import GAData from './GAData';
import CodeVariants from './CodeVariants';
import SchoolMonthlyReport, { ClassReport, SubReport, SchoolReport } from './SchoolMonthlyReport';
import EvaluationReports from './EvaluationReports';
const Logger = MyLogger.getLogger();

/**
 *  レポート生データ作成
 * @export
 * @class SchoolReportHelper
 */
export default class SchoolReportHelper {
    /**
     * レポートエクセルシートの作成 School提供データ（外部データ）
     * @static
     * @param {ClassInfo} classInfo - 教室情報データのオブジェクト
     * @param {SchoolData} schoolData - School提供データのオブジェクト
     * @param {AdServiceData} adServiceData - adService データのオブジェクト
     * @param {MediumData[]} mediaData - 媒体データのオブジェクト
     * @param {GAData} gaData - GoogleAnalytics データのオブジェクト
     * @param {CodeVariants} codeVariants - コード変換リストオブジェクト
     * @returns {SchoolMonthlyReport} - 月次レポート生データ
     * @memberof SchoolReportHelper
     */
    static createReports(
        classInfo: ClassInfo,
        schoolData: SchoolData,
        adServiceData: AdServiceData,
        mediaData: MediumData[],
        gaData: GAData,
        codeVariants: CodeVariants
    ): SchoolMonthlyReport {
        const classReports = classInfo.data.map(classInfoDatum => {
            Logger.info(`Main.doMakeSheet: start: ${classInfoDatum.name}`);
            const classReport = new ClassReport(
                typeof classInfoDatum.code !== 'undefined' ? String(classInfoDatum.code) : '',
                typeof classInfoDatum.name !== 'undefined' ? String(classInfoDatum.name) : '',
                typeof classInfoDatum.fc !== 'undefined' ? String(classInfoDatum.fc) : '',
                typeof classInfoDatum.sv !== 'undefined' ? String(classInfoDatum.sv) : '',
                typeof classInfoDatum.fileName !== 'undefined' ? String(classInfoDatum.fileName) : '',
                typeof classInfoDatum.prefecture !== 'undefined' ? String(classInfoDatum.prefecture) : ''
            );

            // 対象月リスト作成 ----------------------------------------------
            const loopDate = new MyDate(MyUtil.getDateFromExcelDatetime(classInfoDatum.from));
            const fromDate = new MyDate(MyUtil.getDateFromExcelDatetime(classInfoDatum.from));
            const toDate = new MyDate(MyUtil.getDateFromExcelDatetime(classInfoDatum.to));
            const monthList: string[] = [];

            if (fromDate.toString() === 'Invalid Date') {
                throw new Error(
                    `ERROR: MakeReportHelper.createReports / classInfo fromDate for location "${classInfoDatum.name}" was not valid Date.`
                );
            }
            if (toDate.toString() === 'Invalid Date') {
                throw new Error(
                    `ERROR: MakeReportHelper.createReports / classInfo toDate for location "${classInfoDatum.name}" was not valid Date.`
                );
            }
            if (fromDate > toDate) {
                throw new Error(
                    `ERROR: MakeReportHelper.createReports / classInfo <fromDate(${fromDate})> is greater than <toDate(${toDate})>`
                );
            }

            while (loopDate <= toDate) {
                const tmpDateString = loopDate.getFormattedString('YYYY-MM-15 00:00'); // 何かで誤差が出ても月がずれない15日
                if (!monthList.includes(tmpDateString)) {
                    monthList.push(tmpDateString);
                }
                loopDate.addDay();
            }

            // School作成データ（外部データ）----------------------------------------------
            if (schoolData[classInfoDatum.code]) {
                // ■問い合わせ実績 ---------------------------------------------------------
                classReport.inquiries = SchoolReportHelper.SchoolReport(
                    schoolData,
                    '資料請求,見学,体験,タップ数,ナビ',
                    monthList,
                    classInfoDatum.code
                );
                // ■サイト内実績 -----------------------------------------------------------
                classReport.sessions = SchoolReportHelper.SchoolReport(
                    schoolData,
                    'セッション,新規',
                    monthList,
                    classInfoDatum.code
                );
            } else {
                throw new Error(
                    `ERROR: MakeReportHelper.createReports / no schoolData for location "${classInfoDatum.name} (${classInfoDatum.code})"`
                );
            }

            // ■広告配信実績 -----------------------------------------------------------
            // 媒体データ 月集計(Impressions) 複数媒体のデータを合計
            const monthTotal_media = mediaData.reduce((acc: { [s: string]: any }, mediumData): { [s: string]: any } => {
                const monthTotal: { [s: string]: { imp: number; click: number } } = mediumData.makeMonthTotal(
                    fromDate,
                    toDate,
                    classInfoDatum.code
                );
                for (const key in monthTotal) {
                    if (Object.prototype.hasOwnProperty.call(acc, key)) {
                        acc[key] += monthTotal[key].imp;
                    } else {
                        acc[key] = {};
                        acc[key] = monthTotal[key].imp;
                    }
                }
                return acc;
            }, {});

            // GAデータ 月集計(Sessions as Clicks)
            const monthTotal_GA: { [s: string]: any } = gaData.makeMonthTotal(fromDate, toDate, classInfoDatum.code);

            // 月集計(Union Impressions and Clicks(GA sessions))
            const monthTotal_union: { [s: string]: { impressions: number; clicks: number } } = {};
            for (const key in monthTotal_media) {
                if (Object.prototype.hasOwnProperty.call(monthTotal_union, key)) {
                    monthTotal_union[key].impressions = monthTotal_media[key];
                } else {
                    monthTotal_union[key] = { impressions: monthTotal_media[key], clicks: 0 };
                }
            }
            for (const key in monthTotal_GA) {
                if (Object.prototype.hasOwnProperty.call(monthTotal_union, key)) {
                    monthTotal_union[key].clicks = monthTotal_GA[key];
                } else {
                    monthTotal_union[key] = { impressions: 0, clicks: monthTotal_GA[key] };
                }
            }
            Logger.debug(`TEST monthTotal_media: ${JSON.stringify(monthTotal_media)}`);
            Logger.debug(`TEST monthTotal_GA: ${JSON.stringify(monthTotal_GA)}`);
            Logger.debug(`TEST monthTotal_union: ${JSON.stringify(monthTotal_union)}`);

            let impressionSum = 0;
            let clickSum = 0;
            const result_distributes = SchoolReportHelper.DistributesReport(
                monthTotal_union,
                monthList,
                schoolData[classInfoDatum.code]['市区町村']
            );
            classReport.distributes = result_distributes.distributesReports;
            impressionSum = result_distributes.impSum;
            clickSum = result_distributes.clickSum;

            Logger.debug(`TEST result_distributes: ${JSON.stringify(result_distributes)}`);

            // ■広告配信実績 -----------------------------------------------------------
            // adService imp/click
            classReport.creatives = SchoolReportHelper.CreativesReport(
                adServiceData,
                classInfoDatum.code,
                impressionSum,
                clickSum,
                codeVariants
            );

            // ■広告日別実績 -----------------------------------------------------------
            // 媒体 imp/click
            classReport.daily = SchoolReportHelper.DailyReport(mediaData, classInfoDatum.code, fromDate, toDate, gaData);

            return classReport;
        });
        return { classes: classReports };
    }

    /**
     * レポートエクセルシートの作成 School提供データ（外部データ）
     * @private
     * @static
     * @param {SchoolData} schoolData - School提供データのオブジェクト
     * @param {String} fieldsString - 描画するデータ項目の要素名の配列
     * @param {String[]} monthList - 集計範囲の月ごと日付文字列リストの配列
     * @param {string} locationCode - 描画する対象の教室コード
     * @returns {SchoolReport[]} - School外部データレポート生データ
     * @memberof SchoolReportHelper
     */
    private static SchoolReport(
        schoolData: SchoolData,
        fieldsString: string,
        monthList: string[],
        locationCode: string
    ): SchoolReport[] {
        const schoolReports: SchoolReport[] = [];
        const fields = fieldsString.split(',');
        for (const month of monthList) {
            const tmpDate = new MyDate(month);
            const dateString_thisYear = tmpDate.getFormattedString('YYYY年M月');
            const dateString_lastYear = new MyDate(
                `${tmpDate.getFullYear() - 1}/${tmpDate.getFormattedString('MM/DD 00:00')}`
            ).getFormattedString('YYYY年M月');
            const schoolReport_thisYear = new SchoolReport(dateString_thisYear);
            const schoolReport_lastYear = new SchoolReport(dateString_lastYear);
            for (const index in fields) {
                if (
                    !schoolData[locationCode][fields[index]] ||
                    typeof schoolData[locationCode][fields[index]][dateString_thisYear] === 'undefined'
                ) {
                    throw new Error(
                        `ERROR: MakeReportHelper.schoolData / no specified data "${fields[index]}[${dateString_thisYear}]" on schoolData[${locationCode}]`
                    );
                }
                if (
                    !schoolData[locationCode][fields[index]] ||
                    typeof schoolData[locationCode][fields[index]][dateString_lastYear] === 'undefined'
                ) {
                    throw new Error(
                        `ERROR: MakeReportHelper.schoolData / no specified data "${fields[index]}[${dateString_lastYear}]" on schoolData[${locationCode}]`
                    );
                }
                schoolReport_thisYear[fields[index]] = schoolData[locationCode][fields[index]][dateString_thisYear];
                schoolReport_lastYear[fields[index]] = schoolData[locationCode][fields[index]][dateString_lastYear];
            }
            schoolReports.push(schoolReport_thisYear);
            schoolReports.push(schoolReport_lastYear);
        }
        return schoolReports;
    }

    /**
     * レポートエクセルシートの作成 媒体の月別集計データ
     * @private
     * @static
     * @param {any} monthTotal - 月ごとのimpressions/clicksオブジェクト
     * @param {string[]} monthList - 集計範囲の月ごと日付文字列リストの配列
     * @param {any} extraField - 追加表示する SchoolData データ内のオブジェクト
     * @returns {any} - DistributesReport[]、imp/click の計を格納したオブジェクト
     * @memberof SchoolReportHelper
     */
    private static DistributesReport(
        monthTotal: {
            [s: string]: {
                impressions: any;
                clicks: any;
            };
        },
        monthList: string[],
        extraField: { [s: string]: any }
    ): {
        impSum: number;
        clickSum: number;
        distributesReports: SubReport[];
    } {
        const distributesReports: SubReport[] = [];
        let impSum = 0;
        let clickSum = 0;
        let extraSum = 0;
        for (const month of monthList) {
            const distributesReport = new SubReport();
            const monthString = new MyDate(month).getFormattedString('YYYY年M月');
            const imp = monthTotal[monthString] ? parseInt(monthTotal[monthString].impressions) : 0;
            const click = monthTotal[monthString] ? parseInt(monthTotal[monthString].clicks) : 0;
            impSum += imp;
            clickSum += click;
            extraSum += parseInt(extraField[monthString]);
            distributesReport.key = monthString;
            distributesReport.impressions = imp;
            distributesReport.clicks = click;
            distributesReport.extraField_1 = parseInt(extraField[monthString]);
            distributesReports.push(distributesReport);
        }
        // 最後に合計値を書き込む
        distributesReports.push(new SubReport('合計', impSum, clickSum, extraSum));
        return {
            impSum: impSum,
            clickSum: clickSum,
            distributesReports: distributesReports,
        };
    }

    /**
     * レポートエクセルシートの作成 adService データ -
     * 集計に於いては媒体の imp/click 合計値に合わせ、正しい比率に応じて数値を自動調整する
     * @private
     * @static
     * @param {AdServiceData} adServiceData - adService データのオブジェクト
     * @param {string} locationCode - 描画する教室の教室コード文字列
     * @param {number} targetImp - 最終的に表示すべき imp 合計値
     * @param {number} targetClick - 最終的に表示すべき click 合計値
     * @param {CodeVariants} codeVariants - コード変換リストオブジェクト
     * @returns {SubReport[]} - レポート生データ
     * @memberof SchoolReportHelper
     */
    private static CreativesReport(
        adServiceData: AdServiceData,
        locationCode: string,
        targetImp: number,
        targetClick: number,
        codeVariants: CodeVariants
    ): SubReport[] {
        const creativesReports: SubReport[] = [];
        let impSum = 0;
        let clickSum = 0;
        let impSum_correction = 0; // 補正後の合計
        let clickSum_correction = 0; // 補正後の合計
        const descendantCodes = codeVariants.getDescendantCodes(locationCode);
        descendantCodes.push(locationCode);
        for (const creative of adServiceData.creatives) {
            descendantCodes.forEach(code => {
                impSum +=
                    adServiceData.imp_click[code] && adServiceData.imp_click[code][creative]
                        ? adServiceData.imp_click[code][creative].imp
                        : 0;
                clickSum +=
                    adServiceData.imp_click[code] && adServiceData.imp_click[code][creative]
                        ? adServiceData.imp_click[code][creative].click
                        : 0;
            });
        }
        for (const creative of adServiceData.creatives) {
            const creativesReport = new SubReport();
            // 媒体の imp/click 合計値に合わせて補正
            let imp = 0;
            let click = 0;
            descendantCodes.forEach(code => {
                imp +=
                    adServiceData.imp_click[code] && adServiceData.imp_click[code][creative]
                        ? adServiceData.imp_click[code][creative].imp
                        : 0;
                click +=
                    adServiceData.imp_click[code] && adServiceData.imp_click[code][creative]
                        ? adServiceData.imp_click[code][creative].click
                        : 0;
            });
            if (impSum === 0) {
                // adService の imp 合計が 0 の時はクリエイティブ均等に振り分ける
                imp = MyUtil.round(targetImp / adServiceData.creatives.length, 0);
                click = MyUtil.round(targetClick / adServiceData.creatives.length, 0);
            } else if (clickSum === 0) {
                // adService の click 合計のみ 0 の時は imp の比に合わせる
                click = MyUtil.round((imp / impSum) * targetClick, 0);
            } else {
                imp = MyUtil.round((imp / impSum) * targetImp, 0);
                click = MyUtil.round((click / clickSum) * targetClick, 0);
            }

            impSum_correction += imp;
            clickSum_correction += click;

            creativesReport.key = creative;
            creativesReport.impressions = imp;
            creativesReport.clicks = click;
            creativesReports.push(creativesReport);
        }
        // 媒体の imp/click 合計値に合わせて補正した後生じた差分を最大値のところにつけて辻褄を合わす処理
        // これ均等に振り分けるとか 0 にならないようにするとか必要かも
        const argMax = (array: any[], propartyName: string) => {
            return array
                .map((x: any, i: number) => [x[propartyName], i])
                .reduce((r: any[], a: any[]) => (a[0] > r[0] ? a : r))[1];
        };
        if (impSum_correction !== 0) {
            creativesReports[argMax(creativesReports, 'impressions')].impressions += targetImp - impSum_correction;
        }
        if (clickSum_correction !== 0) {
            creativesReports[argMax(creativesReports, 'clicks')].clicks += targetClick - clickSum_correction;
        }
        // 最後に合計値を書き込む
        creativesReports.push(new SubReport('合計', targetImp, targetClick));

        return creativesReports;
    }

    /**
     * レポートエクセルシートの作成 媒体データ 日次
     * @private
     * @static
     * @param {MediumData[]} mediaData - 媒体データのオブジェクトの配列
     * @param {string} locationCode - 対象教室コード
     * @param {MyDate} fromDate - 集計範囲開始日
     * @param {MyDate} toDate - 集計範囲終了日
     * @param {GAData} gaData - GoogleAnalytics データオブジェクト
     * @returns {SubReport[]} - 最終描画位置行数
     * @memberof SchoolReportHelper
     */
    private static DailyReport(
        mediaData: MediumData[],
        locationCode: string,
        fromDate: MyDate,
        toDate: MyDate,
        gaData: GAData
    ): SubReport[] {
        const dailyReports: SubReport[] = [];
        let impSum = 0;
        let clickSum = 0;

        const loopDate = new MyDate(fromDate);
        while (loopDate <= toDate) {
            const dailyReport = new SubReport(loopDate.getTime().toString());
            for (const mediumData of mediaData) {
                if (
                    typeof mediumData !== 'undefined' &&
                    typeof mediumData.imp_click[locationCode] !== 'undefined' &&
                    typeof mediumData.imp_click[locationCode][loopDate.getDateString('-')] !== 'undefined'
                ) {
                    dailyReport.impressions += mediumData.imp_click[locationCode][loopDate.getDateString('-')].imp;
                }
            }
            if (
                Object.prototype.hasOwnProperty.call(gaData.data, locationCode) &&
                Object.prototype.hasOwnProperty.call(gaData.data[locationCode], loopDate.getDateString('-'))
            ) {
                dailyReport.clicks = gaData.data[locationCode][loopDate.getDateString('-')];
            }

            impSum += dailyReport.impressions;
            clickSum += dailyReport.clicks;
            loopDate.addDay();
            dailyReports.push(dailyReport);
        }
        // 最後に合計値を書き込む
        dailyReports.push(new SubReport('合計', impSum, clickSum));

        return dailyReports;
    }

    /**
     * オーナー別にまとめたレポートを得る
     * @static
     * @param {SchoolMonthlyReport} reports - 生レポートデータ
     * @param {string} owner - オーナー名（例: 'コネクトム 太郎_1234567'）
     * @returns {SchoolMonthlyReport} - 月次レポート生データ
     * @memberof SchoolReportHelper
     */
    public static aggregateReportsByOwner(reports: SchoolMonthlyReport, owner: string): SchoolMonthlyReport {
        return { classes: reports.classes.filter(classReport => classReport.owner && classReport.owner === owner) };
    }

    /**
     * 生レポートをすべて合算したレポートを得る
     * @static
     * @param {SchoolMonthlyReport} reports - 生レポートデータ
     * @returns {SchoolMonthlyReport} - 月次レポート生データ
     * @memberof SchoolReportHelper
     */
    public static sumReports(reports: SchoolMonthlyReport): SchoolMonthlyReport {
        const resultReports = new SchoolMonthlyReport();
        const blankClassReport = new ClassReport();

        /**
         * ２つの SchoolReport の合計値を得る
         * @param {SchoolReport[]} reports_A - 合計するレポートA
         * @param {SchoolReport[]} reports_B - 合計するレポートB
         * @returns {SchoolReport[]} - 合計したレポート
         */
        const sumSchoolReports = (reports_A: SchoolReport[], reports_B: SchoolReport[]): SchoolReport[] => {
            const resultReports: SchoolReport[] = [];
            // key list 作成
            const keyList: string[] = [];
            reports_A.forEach(v => {
                keyList.push(v.key);
            });
            reports_B.forEach(v => {
                keyList.push(v.key);
            });
            // unique
            const keySet = new Set(keyList);
            // make sum report
            for (const key of keySet) {
                const report_A = reports_A.filter(v => v.key === key);
                const report_B = reports_B.filter(v => v.key === key);
                const resultReport = new SchoolReport(key);
                if (report_A.length && report_B.length) {
                    for (const subKey in report_A[0]) {
                        if (subKey !== 'key') {
                            resultReport[subKey] = report_A[0][subKey] + report_B[0][subKey];
                        }
                    }
                    resultReports.push(resultReport);
                } else if (report_A.length) {
                    for (const subKey in report_A[0]) {
                        if (subKey !== 'key') {
                            resultReport[subKey] = report_A[0][subKey];
                        }
                    }
                    resultReports.push(resultReport);
                } else if (report_B.length) {
                    for (const subKey in report_B[0]) {
                        if (subKey !== 'key') {
                            resultReport[subKey] = report_B[0][subKey];
                        }
                    }
                    resultReports.push(resultReport);
                }
            }
            return resultReports;
        };

        /**
         * ２つの SubReport の合計値を得る
         * @param {SubReport[]} reports_A - 合計するレポートA
         * @param {SubReport[]} reports_B - 合計するレポートB
         * @returns {SubReport[]} - 合計したレポート
         */
        const sumSubReports = (reports_A: SubReport[], reports_B: SubReport[]): SubReport[] => {
            const resultReports: SubReport[] = [];
            // key list 作成
            const keyList: string[] = [];
            reports_A.forEach(v => {
                keyList.push(v.key);
            });
            reports_B.forEach(v => {
                keyList.push(v.key);
            });
            // unique
            const keySet = new Set(keyList);
            // make sum report
            for (const key of keySet) {
                const report_A = reports_A.filter(v => v.key === key);
                const report_B = reports_B.filter(v => v.key === key);
                const resultReport = new SubReport(key);
                if (report_A.length && report_B.length) {
                    resultReport.impressions = report_A[0].impressions + report_B[0].impressions;
                    resultReport.clicks = report_A[0].clicks + report_B[0].clicks;
                    resultReport.extraField_1 = report_A[0].extraField_1 + report_B[0].extraField_1;
                    resultReport.extraField_2 = report_A[0].extraField_2 + report_B[0].extraField_2;
                    resultReport.extraField_3 = report_A[0].extraField_3 + report_B[0].extraField_3;
                    resultReports.push(resultReport);
                } else if (report_A.length) {
                    resultReport.impressions = report_A[0].impressions;
                    resultReport.clicks = report_A[0].clicks;
                    resultReport.extraField_1 = report_A[0].extraField_1;
                    resultReport.extraField_2 = report_A[0].extraField_2;
                    resultReport.extraField_3 = report_A[0].extraField_3;
                    resultReports.push(resultReport);
                } else if (report_B.length) {
                    resultReport.impressions = report_B[0].impressions;
                    resultReport.clicks = report_B[0].clicks;
                    resultReport.extraField_1 = report_B[0].extraField_1;
                    resultReport.extraField_2 = report_B[0].extraField_2;
                    resultReport.extraField_3 = report_B[0].extraField_3;
                    resultReports.push(resultReport);
                }
            }
            return resultReports;
        };

        resultReports.classes = [
            reports.classes.reduce((sumClassReport: ClassReport, classReport): ClassReport => {
                // inquiries
                sumClassReport.inquiries = sumSchoolReports(sumClassReport.inquiries, classReport.inquiries);
                // sessions
                sumClassReport.sessions = sumSchoolReports(sumClassReport.sessions, classReport.sessions);
                // creatives
                sumClassReport.creatives = sumSubReports(sumClassReport.creatives, classReport.creatives);
                // distributes
                sumClassReport.distributes = sumSubReports(sumClassReport.distributes, classReport.distributes);
                // daily
                sumClassReport.daily = sumSubReports(sumClassReport.daily, classReport.daily);
                return sumClassReport;
            }, blankClassReport),
        ];

        resultReports.classes[0].code = reports.classes[0].owner;
        resultReports.classes[0].name = reports.classes[0].owner.replace(/_\d+/, ' さん');
        resultReports.classes[0].owner = reports.classes[0].owner;
        resultReports.classes[0].supervisor = reports.classes[0].supervisor;
        resultReports.classes[0].fileName = 'オーナー_' + reports.classes[0].owner;

        return resultReports;
    }

    /**
     * 生データを配列に開く（ヘッダ行つき）
     * @static
     * @param {SchoolMonthlyReport} reports - 生レポートデータ
     * @param {EvaluationReports} evaluationReports - 広告評価レポート
     * @param {MyDate} fromDate - 集計開始日
     * @param {MyDate} toDate - 集計終了日
     * @returns {object[]} - レポートを展開した配列
     * @memberof SchoolReportHelper
     */
    public static flatReports(
        reports: SchoolMonthlyReport,
        evaluationReports: EvaluationReports,
        fromDate: MyDate,
        toDate: MyDate
    ): object[] {
        const flatReports: object[] = [];

        // make haeders
        if (reports.classes.length > 0) {
            const flatReport: string[] = [];
            const report = reports.classes[0];

            // classReport
            flatReport.push('code');
            flatReport.push('name');
            flatReport.push('owner');
            flatReport.push('supervisor');
            flatReport.push('fileName');
            flatReport.push('prefecture');

            // evaluationReport
            flatReport.push('inquiries_ratio_to_lastyear');
            flatReport.push('sessions_ratio_to_lastyear');
            flatReport.push('inquiries_ratio_to_pref_average');
            flatReport.push('inquiries_ratio_to_all_average');
            flatReport.push('sessions_ratio_to_pref_average');
            flatReport.push('sessions_ratio_to_all_average');
            flatReport.push('impressions_ratio_to_pref_average');
            flatReport.push('impressions_ratio_to_all_average');
            flatReport.push('ctr_ratio_to_pref_average');
            flatReport.push('ctr_ratio_to_all_average');

            // inquiries
            report.inquiries.forEach(subReport => {
                for (const key in subReport) {
                    if (key !== 'key') {
                        flatReport.push(`${subReport.key} ${key}`);
                    }
                }
            });

            // sessions
            report.sessions.forEach(subReport => {
                for (const key in subReport) {
                    if (key !== 'key') {
                        flatReport.push(`${subReport.key} ${key}`);
                    }
                }
            });

            // distributes
            report.distributes.forEach(subReport => {
                flatReport.push(`${subReport.key} impressions`);
                flatReport.push(`${subReport.key} clicks`);
                flatReport.push(`${subReport.key} sessions_via_city`);
                //flatReport.push(`${subReport.key} extraField_2`); // 未使用
                //flatReport.push(`${subReport.key} extraField_3`); // 未使用
            });

            // creatives
            report.creatives.forEach(subReport => {
                flatReport.push(`${subReport.key} impressions`);
                flatReport.push(`${subReport.key} clicks`);
            });

            // daily
            const loopDate = new MyDate(fromDate.getTime());
            while (loopDate <= toDate) {
                flatReport.push(`${loopDate.getFormattedString('YYYY-MM-DD')} impressions`);
                flatReport.push(`${loopDate.getFormattedString('YYYY-MM-DD')} clicks`);
                loopDate.addDay(1);
            }
            flatReports.push(flatReport);
        }

        // make data
        reports.classes.forEach(report => {
            const flatReport: string[] = [];
            flatReport.push(report.code);
            flatReport.push(report.name);
            flatReport.push(report.owner);
            flatReport.push(report.supervisor);
            flatReport.push(report.fileName);
            flatReport.push(report.prefecture);

            // evaluationReport
            flatReport.push(evaluationReports[report.code].inquiries_ratio_to_lastyear.toString());
            flatReport.push(evaluationReports[report.code].sessions_ratio_to_lastyear.toString());
            flatReport.push(evaluationReports[report.code].inquiries_ratio_to_pref_average.toString());
            flatReport.push(evaluationReports[report.code].inquiries_ratio_to_all_average.toString());
            flatReport.push(evaluationReports[report.code].sessions_ratio_to_pref_average.toString());
            flatReport.push(evaluationReports[report.code].sessions_ratio_to_all_average.toString());
            flatReport.push(evaluationReports[report.code].impressions_ratio_to_pref_average.toString());
            flatReport.push(evaluationReports[report.code].impressions_ratio_to_all_average.toString());
            flatReport.push(evaluationReports[report.code].ctr_ratio_to_pref_average.toString());
            flatReport.push(evaluationReports[report.code].ctr_ratio_to_all_average.toString());

            // inquiries
            report.inquiries.forEach(subReport => {
                for (const key in subReport) {
                    if (key !== 'key') {
                        flatReport.push(subReport[key]);
                    }
                }
            });

            // sessions
            report.sessions.forEach(subReport => {
                for (const key in subReport) {
                    if (key !== 'key') {
                        flatReport.push(subReport[key]);
                    }
                }
            });

            // distributes
            report.distributes.forEach(subReport => {
                flatReport.push(String(subReport.impressions));
                flatReport.push(String(subReport.clicks));
                flatReport.push(String(subReport.extraField_1));
                //flatReport.push(String(subReport.extraField_2)); // 未使用
                //flatReport.push(String(subReport.extraField_3)); // 未使用
            });

            // creatives
            report.creatives.forEach(subReport => {
                flatReport.push(String(subReport.impressions));
                flatReport.push(String(subReport.clicks));
            });

            // daily
            const loopDate = new MyDate(fromDate.getTime());
            while (loopDate <= toDate) {
                const subReport = report.daily.filter(
                    v => new MyDate(v.key).getFormattedString('YYYYMMDD') === loopDate.getFormattedString('YYYYMMDD')
                );
                if (subReport.length) {
                    flatReport.push(String(subReport[0].impressions));
                    flatReport.push(String(subReport[0].clicks));
                } else {
                    flatReport.push('0');
                    flatReport.push('0');
                }
                loopDate.addDay(1);
            }

            flatReports.push(flatReport);
        });
        return flatReports;
    }

    /**
     * 教室ごとに月ごとの集計データがあり、それらをまとめるためのサブ集計
     * @static
     * @param {ClassReport} report - クラス別レポート
     * @param {MyDate} fromDate - 集計開始日
     * @param {MyDate} toDate - 集計終了日
     * @returns {any} - 集計データ
     * @memberof SchoolReportHelper
     */
    public static sumSubReport(
        report: ClassReport,
        fromDate: MyDate,
        toDate: MyDate
    ): {
        impressions: number;
        clicks: number;
        inquiries: number;
        sessions: number;
    } {
        const subReport_sum = {
            impressions: 0,
            clicks: 0,
            inquiries: 0,
            sessions: 0,
        };
        report.distributes.forEach(subReport => {
            if (subReport.key === '合計') {
                subReport_sum.impressions += subReport.impressions;
                subReport_sum.clicks += subReport.clicks;
            }
        });
        // inquiries, sessions は集計対象期間の key のみ集計するようにする
        // key は 'YYYY年M月' 形式の文字列なので、Date に直して範囲を確定する
        // key を Date 化するときには月の中ほど（15日）とする
        // PARAMETERS.FROM_DATE, TO_DATE は月内の任意の日になるので、FROM_DATE は同月1日, TO_DATE は同月25日に置き換える
        const keyStringToMyDate = (key: string): MyDate => {
            const strDate = key.replace(/[年月]/g, '-') + '15 00:00:00';
            return new MyDate(strDate);
        };
        const fromDateTime = new MyDate(fromDate.getFormattedString('YYYY-MM-01 00:00:00')).getTime();
        const toDateTime = new MyDate(toDate.getFormattedString('YYYY-MM-25 00:00:00')).getTime();

        report.inquiries.forEach(subReport => {
            const keyDate = keyStringToMyDate(subReport.key).getTime();
            if (fromDateTime < keyDate && keyDate < toDateTime) {
                for (const key in subReport) {
                    if (key !== 'key') {
                        subReport_sum.inquiries += Number(subReport[key]);
                    }
                }
            }
        });
        report.sessions.forEach(subReport => {
            const keyDate = keyStringToMyDate(subReport.key).getTime();
            if (fromDateTime < keyDate && keyDate < toDateTime) {
                for (const key in subReport) {
                    if (key === 'セッション') {
                        subReport_sum.sessions += Number(subReport[key]);
                    }
                }
            }
        });
        return subReport_sum;
    }
}
