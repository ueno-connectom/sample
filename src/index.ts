console.log('function start...');

import * as FS from 'fs';
import S3Util from './modules/S3Util';
import MyUtil from './modules/MyUtil';
import MyLogger from './modules/MyLogger';
import MyDate from './modules/MyDate';
import Athena from './modules/Athena';
import Lambda from './modules/Lambda';
import MyParameters from './modules/school/MyParameters';
import CodeVariants from './modules/school/CodeVariants';
import ClassInfo from './modules/school/ClassInfo';
import SchoolData from './modules/school/SchoolData';
import GAData from './modules/school/GAData';
import Suggestions from './modules/school/Suggestions';
import AverageData from './modules/school/AverageData';
import EvaluationReports, { IEvaluationReport } from './modules/school/EvaluationReports';
import MediumData from './modules/school/MediumData';
import SchoolMonthlyReport, { ClassReport, SubReport, SchoolReport } from './modules/school/SchoolMonthlyReport';
import MakeReportHelper from './modules/school/MakeReportHelper';
import OutputReportHelper from './modules/school/OutputReportHelper';
const Logger = MyLogger.getLogger();

let PARAMETERS: MyParameters;

process.on('uncaughtException', err => {
    Logger.error(`Caught exception: ${err}`);
    process.exit(1);
});
process.on('unhandledRejection', (reason, p) => {
    Logger.error(`Unhandled Rejection at: ${p}, reason: ${reason}`);
    process.exit(1);
});

// Main -------------------------------------------------------------------------------------------
/**
 * メイン
 * @param {Object} event - Lambda のイベントパラメータオブジェクト
 */
exports.handler = async (event: any) => {
    Logger.clear();
    Logger.setLevel('trace');

    Logger.info('main start');

    /**
     * 実行結果オブジェクト ステータスコードを設定して返す
     * @param {number} statusCode - statusCode
     * @returns {Object} -
     */
    const getReturnObject = (statusCode = 200) => {
        return {
            statusCode: statusCode,
            body: Logger.getLogs(),
        };
    };

    // Lambda の実行時パラメータを解釈
    PARAMETERS = MyParameters.getInstance(event);

    PARAMETERS.setValue('TARGET_CAMPAIGN_ID', 'string', true);
    PARAMETERS.setValue('FROM_DATE', 'Date', true);
    PARAMETERS.setValue('TO_DATE', 'Date', true);
    PARAMETERS.setValue('S3_BUCKET_RESTRICTION_PATTERN', 'string', true);
    PARAMETERS.setValue('S3_BASE', 'string', true);
    PARAMETERS.setValue('S3_EXCEL_CLASS_INFO', 'string', true);
    PARAMETERS.setValue('S3_EXCEL_REPORT_TEMPLATE', 'string', true);
    PARAMETERS.setValue('S3_EXCEL_SCHOOL_DATA', 'string', true);
    PARAMETERS.setValue('S3_EXCEL_GA_DATA', 'string', true);
    PARAMETERS.setValue('S3_EXCEL_CODE_VARIANTS', 'string', true);
    PARAMETERS.setValue('S3_EXCEL_SUGGESTIONS', 'string', true);
    PARAMETERS.setValue('S3_ATHENA_OUTPUT', 'string', true);
    PARAMETERS.setValue('S3_REPORTS_DST_SV', 'string', true);
    PARAMETERS.setValue('S3_REPORTS_DST_FC', 'string', true);
    PARAMETERS.setValue('EXCEL_SHEETNAME_TEMPLATE', 'string', true);
    PARAMETERS.setValue('EXCEL_SHEETNAME_CLASS_INFO', 'string', true);
    PARAMETERS.setValue('EXCEL_SHEETNAME_SCHOOL_DATA', 'string', true);
    PARAMETERS.setValue('EXCEL_SHEETNAME_GA_DATA', 'string', true);
    PARAMETERS.setValue('EXCEL_SHEETNAME_CODE_VARIANTS', 'string', true);
    PARAMETERS.setValue('EXCEL_SHEETNAME_SUGGESTIONS', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_CODE', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_NAME', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_FROM_DATE', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_TO_DATE', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_FOLDER_1', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_FOLDER_2', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_RERORT_TITLE', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_PREFECTURE', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_GA_CODE', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_GA_DATE', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_GA_SESSIONS', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_SUGGESTIONS_PATTERN', 'string', true);
    PARAMETERS.setValue('EXCEL_CELLHEADER_SUGGESTIONS_TEXT', 'string', true);
    PARAMETERS.setValue('EXCEL_DEFINITION_SCHOOL', 'string', true);
    PARAMETERS.setValue('S3_MAX_KEYS', 'number', true);
    PARAMETERS.setValue('S3_CONTENT_ENCODING', 'string', true);
    PARAMETERS.setValue('LOCAL_FILE_STORE', 'string', true);
    PARAMETERS.setValue('LOG_LEVEL', 'string', true);
    PARAMETERS.setValue('LAMBDA_SUB_REDSHIFT', 'string', true);
    PARAMETERS.setValue('PARALLEL_EXECUTE_LIMIT', 'number', true);
    PARAMETERS.setValue('ATHENA_QUERY_TIMEOUT', 'number', true);
    S3Util.BUCKET_RESTRICTION_PATTERN = PARAMETERS.S3_BUCKET_RESTRICTION_PATTERN;

    Logger.setLevel(PARAMETERS.LOG_LEVEL);

    // 日付の前後確認
    if (PARAMETERS.FROM_DATE > PARAMETERS.TO_DATE) {
        PARAMETERS.addError(
            `The parameetr <FROM_DATE(${PARAMETERS.FROM_DATE})> is greater than <TO_DATE(${PARAMETERS.TO_DATE})>`
        );
    }
    // S3 Base URL setting
    if (!/\/$/.test(PARAMETERS.S3_BASE)) {
        PARAMETERS.S3_BASE += '/';
    }
    if (!/^s3:\/\//i.test(PARAMETERS.S3_BASE)) {
        PARAMETERS.S3_BASE = 's3://' + PARAMETERS.S3_BASE.replace(/^\/+/, '');
    }
    if (S3Util.setDefaultBase(PARAMETERS.S3_BASE) === '') {
        PARAMETERS.addError(
            `The parameter <S3_BASE> is not valid S3 url. The input parameter was: ${PARAMETERS.S3_BASE}`
        );
    }
    // Other S3 URLs
    [
        'S3_EXCEL_CLASS_INFO',
        'S3_REPORTS_DST_SV',
        'S3_REPORTS_DST_FC',
        'S3_EXCEL_REPORT_TEMPLATE',
        'S3_EXCEL_SCHOOL_DATA',
        'S3_ATHENA_OUTPUT',
        'S3_EXCEL_GA_DATA',
        'S3_EXCEL_CODE_VARIANTS',
        'S3_EXCEL_SUGGESTIONS',
    ].forEach(value => {
        try {
            PARAMETERS[value] = S3Util.makeS3URL(PARAMETERS[value]);
            if (!S3Util.isValidURL(PARAMETERS[value])) {
                PARAMETERS.addError(
                    `The parameter <${value}> is not valid S3 url. The input parameter was: ${PARAMETERS[value]}`
                );
            }
        } catch (err) {
            PARAMETERS.addError(
                `The parameter <${value}> is not valid S3 url. The input parameter was: ${PARAMETERS[value]}\n${err}`
            );
            return;
        }
    });

    // パラメータエラー時
    if (PARAMETERS.errors && PARAMETERS.errors.length) {
        Logger.error(`ERROR: Main / Some event parameters were invalid.\n${PARAMETERS.errors.join('\n')}`);
        return getReturnObject(500);
    }

    Logger.debug('\nPARAMETERS: ' + JSON.stringify(PARAMETERS));

    // ------------------------------------------------------------------------
    // 教室情報（準備）
    //
    const classInfo = new ClassInfo();
    classInfo.setDefinitionFromParams(PARAMETERS);

    // ------------------------------------------------------------------------
    // adService imp/clic（Redshift）（子 Lambda 準備）
    //
    const subLabmdaPayload = {
        TARGET_CAMPAIGN_ID: PARAMETERS.TARGET_CAMPAIGN_ID,
        FROM_DATE: PARAMETERS.FROM_DATE.getFormattedString('YYYY-MM-DD'),
        TO_DATE: PARAMETERS.TO_DATE.getFormattedString('YYYY-MM-DD'),
        LOG_ON: true,
    };
    const AdService_subLambda = new Lambda(PARAMETERS.LAMBDA_SUB_REDSHIFT, subLabmdaPayload);

    // Mediaone
    const athena_mediaone = new Athena(PARAMETERS.S3_ATHENA_OUTPUT, PARAMETERS.ATHENA_QUERY_TIMEOUT);
    await athena_mediaone.connect();
    const mediumData_mediaone = new MediumData(athena_mediaone);

    // mediaone history
    const athena_mediaone_history = new Athena(PARAMETERS.S3_ATHENA_OUTPUT, PARAMETERS.ATHENA_QUERY_TIMEOUT);
    await athena_mediaone_history.connect();
    const mediumData_mediaone_history = new MediumData(athena_mediaone_history);

    // MEDIATWO
    const athena_mediatwo = new Athena(PARAMETERS.S3_ATHENA_OUTPUT, PARAMETERS.ATHENA_QUERY_TIMEOUT);
    await athena_mediatwo.connect();
    const mediumData_mediatwo = new MediumData(athena_mediatwo);

    // ------------------------------------------------------------------------
    // コード変換表 作成
    const codeVariants = new CodeVariants();
    try {
        const codeVariantsSheet = await S3Util.getExcelSheetFromS3(
            {
                Bucket: S3Util.getBucket(PARAMETERS.S3_EXCEL_CODE_VARIANTS),
                Key: S3Util.getKey(PARAMETERS.S3_EXCEL_CODE_VARIANTS),
            },
            PARAMETERS.EXCEL_SHEETNAME_CODE_VARIANTS
        );
        codeVariants.makeFromSheet(codeVariantsSheet);
    } catch (err) {
        Logger.warn('WARN: Main / Could not fetch code variants list.\n' + err);
    }

    // ------------------------------------------------------------------------
    // 各データの取得（並列実行）
    //
    let asyncResult: any[];
    try {
        asyncResult = await Promise.all([
            // 教室情報エクセルの読み込み
            S3Util.getExcelSheetFromS3(
                {
                    Bucket: S3Util.getBucket(PARAMETERS.S3_EXCEL_CLASS_INFO),
                    Key: S3Util.getKey(PARAMETERS.S3_EXCEL_CLASS_INFO),
                },
                PARAMETERS.EXCEL_SHEETNAME_CLASS_INFO
            ),

            // レポートテンプレートファイルのコピー
            S3Util.copyFileFromS3ToLocal(
                {
                    Bucket: S3Util.getBucket(PARAMETERS.S3_EXCEL_REPORT_TEMPLATE),
                    Key: S3Util.getKey(PARAMETERS.S3_EXCEL_REPORT_TEMPLATE),
                },
                PARAMETERS.LOCAL_FILE_STORE
            ),

            // Schoolの外部データを読み込む
            S3Util.getExcelSheetFromS3(
                {
                    Bucket: S3Util.getBucket(PARAMETERS.S3_EXCEL_SCHOOL_DATA),
                    Key: S3Util.getKey(PARAMETERS.S3_EXCEL_SCHOOL_DATA),
                },
                PARAMETERS.EXCEL_SHEETNAME_SCHOOL_DATA
            ),

            // adServiceから imp/click データを持ってくる
            AdService_subLambda.invoke(),

            // 媒体 imp/click データ
            mediumData_mediaone.fetchDataBySQL(`
                SELECT code, date, imps AS imp, clicks AS click
                FROM prod_school_f.mediaone_location
                WHERE date BETWEEN DATE('${PARAMETERS.FROM_DATE.getFormattedString(
                    'YYYY-MM-DD'
                )}') AND DATE('${PARAMETERS.TO_DATE.getFormattedString('YYYY-MM-DD')}')
                ORDER BY code ASC, date ASC;
            `),
            mediumData_mediaone_history.fetchDataBySQL(`
                SELECT code, date, imps AS imp, clicks AS click
                FROM prod_school_f.mediaone_history
                WHERE date BETWEEN DATE('${PARAMETERS.FROM_DATE.getFormattedString(
                    'YYYY-MM-DD'
                )}') AND DATE('${PARAMETERS.TO_DATE.getFormattedString('YYYY-MM-DD')}')
                ORDER BY code ASC, date ASC;
            `),
            mediumData_mediatwo.fetchDataBySQL(`
                SELECT code, date, impression_count AS imp, click_count AS click
                FROM prod_school_f.mediatwo
                WHERE date BETWEEN DATE ('${PARAMETERS.FROM_DATE.getFormattedString(
                    'YYYY-MM-DD'
                )}') AND DATE ('${PARAMETERS.TO_DATE.getFormattedString('YYYY-MM-DD')}')
                ORDER BY code ASC, date ASC;
            `),

            // GA データを読み込む
            S3Util.getExcelSheetFromS3(
                {
                    Bucket: S3Util.getBucket(PARAMETERS.S3_EXCEL_GA_DATA),
                    Key: S3Util.getKey(PARAMETERS.S3_EXCEL_GA_DATA),
                },
                PARAMETERS.EXCEL_SHEETNAME_GA_DATA
            ),

            // 示唆コメントエクセルの読み込み
            S3Util.getExcelSheetFromS3(
                {
                    Bucket: S3Util.getBucket(PARAMETERS.S3_EXCEL_SUGGESTIONS),
                    Key: S3Util.getKey(PARAMETERS.S3_EXCEL_SUGGESTIONS),
                },
                PARAMETERS.EXCEL_SHEETNAME_SUGGESTIONS
            ),
        ]);
    } catch (err) {
        Logger.error('ERROR: Main / Could not fetch all data. something happened.\n' + err);
        return getReturnObject(500);
    }

    // 教室情報エクセル
    const classInfoSheet = asyncResult[0];
    // Schoolの外部データエクセル
    const schoolSheet = asyncResult[2];
    // adService imp/click データ
    const adServiceData = (asyncResult[3].statusCode === 200 && asyncResult[3].contents) || null;
    // GA データエクセルブック
    const gaSheet = asyncResult[7];
    // 示唆コメントエクセルシート
    const suggestionsSheet = asyncResult[8];

    // エラー蓄積
    const storeDataErrors = [];

    // adService imp/click データを確認
    if (!adServiceData) {
        storeDataErrors.push(`adServiceData fetch lambda returned failure / ${asyncResult[3].error}`);
    }
    if (adServiceData && adServiceData.creatives && adServiceData.creatives.length === 0) {
        storeDataErrors.push(
            `adServiceData was not filled / adServiceData.creatives.length: ${adServiceData.creatives &&
                adServiceData.creatives.length}`
        );
    }

    // 媒体 imp/click データを確認
    if (!mediumData_mediaone.filled) {
        storeDataErrors.push('mediumData_mediaone was not filled.');
    }
    if (!mediumData_mediatwo.filled) {
        storeDataErrors.push('mediumData_mediatwo was not filled.');
    }
    // 教室情報エクセルから教室情報データオブジェクトを作成
    if (
        !(
            classInfoSheet &&
            classInfo.setHeadersAddressFromSheet(classInfoSheet) &&
            classInfo.makeSettingsFromSheet(classInfoSheet)
        )
    ) {
        storeDataErrors.push('classInfo excel sheet was something wrong. could not build settings.');
    }
    if (!classInfo || classInfo.data.length === 0) {
        storeDataErrors.push('classInfo was not filled.');
    }
    // Schoolの外部データExcel からデータ格納オブジェクト作成
    if (!schoolSheet) {
        storeDataErrors.push('school excel sheet was something wrong. could not read sheet.');
    }
    const schoolData = new SchoolData(schoolSheet, PARAMETERS.EXCEL_DEFINITION_SCHOOL);
    if (!schoolData.filled) {
        storeDataErrors.push('schoolData was not filled.');
    }

    // ------------------------------------------------------------------------
    // GA セッション数データ 準備
    const gaData = new GAData(
        gaSheet,
        PARAMETERS.EXCEL_CELLHEADER_GA_CODE,
        PARAMETERS.EXCEL_CELLHEADER_GA_DATE,
        PARAMETERS.EXCEL_CELLHEADER_GA_SESSIONS,
        codeVariants
    );
    if (!gaData.filled) {
        storeDataErrors.push('gaData was not filled.');
    }

    // 示唆コメント 準備
    const suggestions = new Suggestions(
        suggestionsSheet,
        PARAMETERS.EXCEL_CELLHEADER_SUGGESTIONS_PATTERN,
        PARAMETERS.EXCEL_CELLHEADER_SUGGESTIONS_TEXT
    );
    Logger.info(`Suggestions Ready: ${suggestions.filled}`);
    Logger.debug(`Suggestions: ${JSON.stringify(suggestions)}`);
    if (!suggestions.filled) {
        storeDataErrors.push('Suggestions were not filled.');
    }

    // 何か足りない場合
    if (storeDataErrors.length > 0) {
        Logger.error('ERROR: Main / Some data sets not enough');
        storeDataErrors.forEach(value => {
            Logger.error(value);
        });
        return getReturnObject(500);
    }

    // ------------------------------------------------------------------------
    // レポート作成
    const reports = MakeReportHelper.createReports(
        classInfo,
        schoolData,
        adServiceData,
        [mediumData_mediatwo, mediumData_mediaone, mediumData_mediaone_history],
        gaData,
        codeVariants
    );

    // オーナー別レポート作成
    const owners = [
        ...new Set(
            reports.classes.reduce((owners: string[], classReport) => {
                owners.push(classReport.owner);
                return owners;
            }, [])
        ),
    ];
    const ownersReports = new SchoolMonthlyReport();
    owners.forEach(owner => {
        Logger.debug(`owner: ${owner}`);
        const ownReports = MakeReportHelper.aggregateReportsByOwner(reports, owner);
        const sumReportsCount = ownReports.classes.length;
        const ownerReport = ownReports.classes.length > 0 ? MakeReportHelper.sumReports(ownReports) : null;
        if (ownerReport) {
            ownerReport.classes[0].sumCount = sumReportsCount;
            ownersReports.classes.push(ownerReport.classes[0]);
        }
    });

    // 都道府県別平均・全国平均データの作成
    const averageData = new AverageData(classInfo, reports, PARAMETERS.FROM_DATE, PARAMETERS.TO_DATE);
    Logger.trace(`Average By Prefecture: ${JSON.stringify(averageData)}`);

    // 広告評価レポートの作成
    const evaluationReports = new EvaluationReports(
        reports,
        averageData,
        suggestions,
        PARAMETERS.FROM_DATE,
        PARAMETERS.TO_DATE
    );
    Logger.trace(`evaluationReports: ${JSON.stringify(evaluationReports)}`);

    // 広告評価レポートの作成（オーナーレポート）
    const evaluationReports_by_owner = new EvaluationReports(
        ownersReports,
        averageData,
        suggestions,
        PARAMETERS.FROM_DATE,
        PARAMETERS.TO_DATE
    );
    Logger.trace(`evaluationReports_by_owner: ${JSON.stringify(evaluationReports_by_owner)}`);

    // ------------------------------------------------------------------------
    // レポート出力

    /**
     * １教室分をレポート出力する
     * @param {ClassReport} classReport - １教室分の生レポート
     * @param {IEvaluationReport} evaluationReport - 広告評価レポート
     * @returns {Promise<any>} -
     */
    const doMakeSheet = async (classReport: ClassReport, evaluationReport: IEvaluationReport): Promise<any> => {
        Logger.info(`Main.doMakeSheet: start: ${classReport.name}`);

        const reportFileName = `${classReport.fileName}.xlsx`;

        // 書き始める行数
        let currentRowNumber = 7;

        // ひな形読み込む
        const reportExcelBook = await MyUtil.getExcelBookFromLocal(
            `${PARAMETERS.LOCAL_FILE_STORE}${MyUtil.getFilenameFromPath(PARAMETERS.S3_EXCEL_REPORT_TEMPLATE)}`
        );
        const sheet = reportExcelBook.sheet(PARAMETERS.EXCEL_SHEETNAME_TEMPLATE);
        if (!sheet) {
            throw new Error(
                `ERROR: Main.doMakeSheet / failed to open report template sheet "${PARAMETERS.EXCEL_SHEETNAME_TEMPLATE}"`
            );
        }

        // 教室名書き込み
        sheet.cell('B2').value(classReport.name + ' 配信レポート');

        // 広告評価レポート
        // ■広告評価
        currentRowNumber = OutputReportHelper.evaluationReport(
            sheet,
            evaluationReport,
            currentRowNumber,
            3,
            classReport.prefecture !== '',
            classReport.prefecture !== ''
        );

        currentRowNumber = 14;

        // School作成データ（外部データ）
        // ■問い合わせ実績
        currentRowNumber = OutputReportHelper.schoolData(
            sheet,
            classReport.inquiries,
            '資料請求,見学,体験,タップ数,ナビ',
            currentRowNumber,
            2,
            4
        );
        // ■サイト内実績
        currentRowNumber = OutputReportHelper.schoolData(
            sheet,
            classReport.sessions,
            'セッション,新規',
            currentRowNumber + 5,
            2,
            3
        );

        // ■広告配信実績
        // 媒体データ 月集計
        currentRowNumber = 4;
        currentRowNumber = OutputReportHelper.mediumMonthTotal(sheet, classReport.distributes, currentRowNumber, 13);

        // ■広告配信実績
        // adService imp/click
        currentRowNumber += 2;
        currentRowNumber = OutputReportHelper.adServiceData(sheet, classReport.creatives, currentRowNumber, 13);

        // ■広告日別実績
        // 媒体 imp/click
        currentRowNumber += 2;
        currentRowNumber = OutputReportHelper.mediaData(sheet, classReport.daily, currentRowNumber, 13);

        // ファイル保存
        Logger.debug(`Main.doMakeSheet: save excel file as: ${PARAMETERS.LOCAL_FILE_STORE}${reportFileName}`);
        await reportExcelBook.toFileAsync(`${PARAMETERS.LOCAL_FILE_STORE}${reportFileName}`);

        // フォルダ分けをして格納（S3アップロード）
        await Promise.all([
            S3Util.copyExcelFileToS3ByClassInfo_SV(
                PARAMETERS.LOCAL_FILE_STORE,
                reportFileName,
                PARAMETERS.S3_REPORTS_DST_SV,
                classReport.supervisor,
                classReport.owner
            ),
            S3Util.copyExcelFileToS3ByClassInfo_FC(
                PARAMETERS.LOCAL_FILE_STORE,
                reportFileName,
                PARAMETERS.S3_REPORTS_DST_FC,
                classReport.owner
            ),
        ]);

        processedClassesCount++;

        return true;
    };

    Logger.info('Main: report output start...');
    let processedClassesCount = 0;
    // 並列実行
    const aa = require('aa');
    const Executors = require('executors');
    const executor = Executors(Number(PARAMETERS.PARALLEL_EXECUTE_LIMIT)); // PARALLEL_EXECUTE_LIMIT: 並列度

    // 教室レポート
    try {
        await aa(function*() {
            const works: any[] = [];
            reports.classes.forEach(classReport => {
                works.push(executor(doMakeSheet, classReport, evaluationReports[classReport.code]));
            });
            yield works;
        });
    } catch (err) {
        Logger.error(`ERROR: Main / class reports output failed.\n${err}`);
        return getReturnObject(500);
    } finally {
        Logger.info(`Main: ${processedClassesCount} class reports ware processed.`);
    }

    // オーナーレポート
    try {
        await aa(function*() {
            const works: any[] = [];
            ownersReports.classes.forEach(classReport => {
                works.push(executor(doMakeSheet, classReport, evaluationReports_by_owner[classReport.code]));
            });
            yield works;
        });
    } catch (err) {
        Logger.error(`ERROR: Main / owner reports output failed.\n${err}`);
        return getReturnObject(500);
    } finally {
        Logger.info(`Main: ${processedClassesCount} owner reports ware processed.`);
    }

    // 一覧生レポートの出力
    const rawReports = MakeReportHelper.flatReports(
        reports,
        evaluationReports,
        PARAMETERS.FROM_DATE,
        PARAMETERS.TO_DATE
    );
    FS.writeFileSync(PARAMETERS.LOCAL_FILE_STORE + 'RawReports.csv', rawReports.join('\r\n'));
    await S3Util.copyFileFromLocalToS3({
        Bucket: S3Util.getBucket(PARAMETERS.S3_BASE),
        Key: S3Util.getKey(PARAMETERS.S3_BASE) + 'report/RawReports.csv',
        Body: FS.readFileSync(PARAMETERS.LOCAL_FILE_STORE + 'RawReports.csv'),
    });

    return getReturnObject();
};
