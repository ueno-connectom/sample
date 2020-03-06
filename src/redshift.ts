console.log('function start...');

import MyUtil from './modules/MyUtil';
import MyDate from './modules/MyDate';
import MyLogger from './modules/MyLogger';
import MyParameters from './modules/school/MyParameters';
import Postgresql from './modules/Postgresql';
import AdServiceData from './modules/school/adServiceData';
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
 * @param {Obejct} context - Lambda のコンテキスト
 * @param {Function} callback - コールバック関数
 * @returns {Object} -
 */
exports.handler = async (event: any, context: any, callback: any) => {
    Logger.clear();
    Logger.info('start main');

    const returnObject = {
        statusCode: 200,
        contents: {},
        error: '',
    };

    PARAMETERS = MyParameters.getInstance(event);
    PARAMETERS.setValue('TARGET_CAMPAIGN_ID', 'string', true);
    PARAMETERS.setValue('FROM_DATE', 'Date', true);
    PARAMETERS.setValue('TO_DATE', 'Date', true);
    PARAMETERS.setValue('REDSHIFT_HOSTNAME', 'string', true);
    PARAMETERS.setValue('REDSHIFT_PORT', 'number', true);
    PARAMETERS.setValue('REDSHIFT_USER', 'string', true);
    PARAMETERS.setValue('REDSHIFT_PASSWORD', 'string', false);
    PARAMETERS.setValue('REDSHIFT_DATABASE', 'string', true);
    PARAMETERS.setValue('LOG_ON', 'boolean', true);

    // 日付の前後確認
    if (PARAMETERS.FROM_DATE > PARAMETERS.TO_DATE) {
        PARAMETERS.addError(
            `parameetr <FROM_DATE(${PARAMETERS.FROM_DATE})> is greater than <TO_DATE(${PARAMETERS.TO_DATE})>`
        );
    }

    // パラメータエラー時
    if (PARAMETERS.errors && PARAMETERS.errors.length) {
        Logger.error(`ERROR: Main / event parameter(s) was invalid.\n${PARAMETERS.errors.join('\n')}`);
        if (callback) {
            returnObject.statusCode = 500;
            returnObject.error = Logger.getLogs();
            return callback(null, JSON.stringify(returnObject));
        }
    }

    // ------------------------------------------------------------------------
    // adServiceからimp/clickを持ってくる（Redshift）
    //
    const redshift = new Postgresql(
        PARAMETERS.REDSHIFT_HOSTNAME,
        PARAMETERS.REDSHIFT_DATABASE,
        PARAMETERS.REDSHIFT_PORT,
        PARAMETERS.REDSHIFT_USER,
        PARAMETERS.REDSHIFT_PASSWORD
    );

    const adServiceData = new AdServiceData(redshift);
    try {
        await adServiceData.fetchData(PARAMETERS.TARGET_CAMPAIGN_ID, PARAMETERS.FROM_DATE, PARAMETERS.TO_DATE);
        returnObject.contents = adServiceData;
    } catch (err) {
        Logger.error('ERROR: Main / something happened\n' + err);
        returnObject.statusCode = 500;
        returnObject.error = 'ERROR: Main / something happened\n' + err;
    }

    Logger.info('function finish');

    if (callback) {
        callback(null, JSON.stringify(returnObject));
    }
};
