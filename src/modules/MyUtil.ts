import MyLogger from './MyLogger';
import MyDate from './MyDate';
const Logger = MyLogger.getLogger();
const XLSX = require('xlsx-populate');

/**
 * その他のこまごましたメソッドまとめクラス（すべてstatic）
 */
export default class MyUtil {
    /**
     * 精度付き四捨五入
     * @param {number} number - 任意の数値
     * @param {number} precision - 小数点以下の桁数
     * @returns {number} - 四捨五入後の数値
     * @static
     */
    public static round(number: number, precision: number) {
        const shift = (number: number, precision: number, reverseShift: boolean = false) => {
            if (reverseShift) {
                precision = -precision;
            }
            const numArray = ('' + number).split('e');
            return +(numArray[0] + 'e' + (numArray[1] ? +numArray[1] + precision : precision));
        };
        return shift(Math.round(shift(number, precision, false)), precision, true);
    }

    /**
     * いわゆるスリープ await MyUtil.sleep(1000) のように使う
     * @param {number} msec - 休止時間（ミリ秒）
     * @returns {Promise} -
     * @static
     */
    public static sleep(msec: number) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, msec);
        });
    }

    /**
     * ローカル（スクリプト動作中の環境）から Excel ブックを読み出す
     * @param {string} path - ローカルのファイルパス
     * @returns {object} - xlsx-populate.Workbook
     * @async
     * @static
     */
    public static async getExcelBookFromLocal(path: string) {
        if (!path) {
            Logger.error('MyUtil.getExcelBookFromLocal / No parameters');
            throw new Error('ERROR: MyUtil.getExcelBookFromLocal / No parameters');
        }
        let workbook;
        try {
            Logger.debug(`MyUtil.GetExcelSheetFromLocal: ${path}`);
            workbook = await XLSX.fromFileAsync(path);
        } catch (err) {
            Logger.error(`MyUtil.getExcelBookFromLocal / The target EXCEL book ${path} could not be opened.\n${err}`);
            throw err;
        }
        return workbook;
    }

    /**
     * Excel の Datetime 形式から JS の Date オブジェクトに変換する
     * @param {number} excelDatetime - Excel Datetime 形式の数値
     * @returns {MyDate} - 日付オブジェクト
     * @static
     */
    public static getDateFromExcelDatetime(excelDatetime: any) {
        if (isNaN(Number(excelDatetime))) {
            Logger.error(`MyUtil.getDateFromExcelDatetime / No valid parameter : ${excelDatetime}`);
            throw new Error(`ERROR: MyUtil.getDateFromExcelDatetime / No valid parameter : ${excelDatetime}`);
        }
        return new MyDate('1899-12-31 00:00:00').addDay(Number(excelDatetime) - 1);
    }

    /**
     * パスからファイル名を取り出す
     * /foo/bar/filename から filename を得る
     * @param {string} str - 任意のファイルパス文字列
     * @returns {string} - ファイル名文字列
     * @static
     */
    public static getFilenameFromPath(str = '') {
        const searchResult = str.match(/\/([^/]+)$/);
        return searchResult && searchResult.length ? searchResult[1] : '';
    }

    /**
     * 文字列からテンプレートをもとに日時を解釈する
     * @param {string} dateString - 解釈したい日付を含んだ文字列
     * @param {string} template - 日付解釈のパターンテンプレート（例 '___YYYY-MM-DDThh:mm:ssZ'）
     * @returns {MyDate} - 日付オブジェクト（MyDate）
     * @static
     */
    public static parseDateString(dateString: string, template = ''): MyDate {
        const resultDate = new MyDate();
        const dateParts = [1900, 0, 1, 0, 0, 0, 0];
        const definition = [
            { pattern: /YYYY/, index: 0, correction: 0 },
            { pattern: /M(M)?/, index: 1, correction: -1 },
            { pattern: /D(D)?/, index: 2, correction: 0 },
            { pattern: /h(h)?/, index: 3, correction: 0 },
            { pattern: /m(m)?/, index: 4, correction: 0 },
            { pattern: /s(s)?/, index: 5, correction: 0 },
            { pattern: /ms/, index: 6, correction: 0 },
        ];
        definition.forEach(part => {
            const matched = template.match(part.pattern);
            if (matched) {
                dateParts[part.index] =
                    Number(dateString.substring(Number(matched.index), Number(matched.index) + matched[0].length)) +
                    part.correction;
            }
        });
        resultDate.setFullYear(dateParts[0]);
        resultDate.setMonth(dateParts[1]);
        resultDate.setDate(dateParts[2]);
        resultDate.setHours(dateParts[3]);
        resultDate.setMinutes(dateParts[4]);
        resultDate.setSeconds(dateParts[5]);
        resultDate.setMilliseconds(dateParts[6]);
        return resultDate;
    }
}
