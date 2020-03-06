import MyLogger from '../MyLogger';
import MyDate from '../MyDate';
import Athena from '../Athena';

const Logger = MyLogger.getLogger();

/**
 *  School提供のデータ（外部データ）クラス
 */
export default class MediumData {
    public filled: boolean = false;
    public imp_click: {
        [s: string]: {
            [s: string]: {
                imp: number;
                click: number;
            };
        };
    } = {};
    public dbConnection: Athena;
    public campaignStringRemoveRegEx: RegExp;

    /**
     * コンストラクタ
     * @param {Object} dbConnection - データベース接続オブジェクト (Athena)
     * @param {RegExp} campaignStringRemoveRegEx - キャンペーン名フィールド内で不要な部分を消去するための正規表現パターン
     */
    constructor(dbConnection: Athena, campaignStringRemoveRegEx = new RegExp('')) {
        this.imp_click = {};
        this.dbConnection = dbConnection;
        this.filled = false;
        this.campaignStringRemoveRegEx = campaignStringRemoveRegEx;
    }

    /**
     * SQL 文で問い合わせを行い、媒体レポート蓄積データベースから imp/click を得る
     * @param {string} queryString - 問い合わせる SQL 文
     * @returns {boolean} - 正常に終了した場合 真
     */
    async fetchDataBySQL(queryString: string) {
        if (!queryString) {
            return false;
        }

        let result: any = await this.dbConnection.query(queryString);
        if (
            result === null ||
            (result && result.ResultSet && result.ResultSet.Rows && result.ResultSet.Rows.length === 0)
        ) {
            // 結果が空っぽの時は一度だけリトライ
            Logger.debug('Athena Query Retry');
            result = await this.dbConnection.query(queryString);
        }
        return (this.filled = await this.makeMediumData(result));
    }

    /**
     * 媒体レポート蓄積データベースの問い合わせ結果から imp/click データを取り出して格納する
     * @param {Object} result - データベース問い合わせ結果オブジェクト (Athena)
     * @returns {boolean} - 常に true
     * @async
     */
    async makeMediumData(result: any) {
        Logger.trace('MediumData.makeMediumData');
        for (const row of result.ResultSet.Rows) {
            const locationCode = String(row.Data[0].VarCharValue).replace(this.campaignStringRemoveRegEx, '');
            if (!this.imp_click[locationCode]) {
                this.imp_click[locationCode] = {};
            }
            const tmpDate = new MyDate(row.Data[1].VarCharValue);
            const tmpDateString =
                tmpDate.toString() !== 'Invalid Date' ? tmpDate.getFormattedString('YYYY-MM-DD') : '--';
            this.imp_click[locationCode][tmpDateString] = {
                imp: parseInt(row.Data[2].VarCharValue),
                click: parseInt(row.Data[3].VarCharValue),
            };
        }
        if (result.NextToken !== '' && result.ResultSet && result.ResultSet.Rows.length === 1000) {
            //loop
            Logger.trace('MediumData.makeMediumData loop');
            const nextResult = await this.dbConnection.getQueryResults(result.NextToken);
            await this.makeMediumData(nextResult);
        }
        return true;
    }

    /**
     * 月ごとの imp/click 集計
     * @param {MyDate} fromDate - 集計範囲開始日
     * @param {MyDate} toDate - 集計範囲終了日
     * @param {string} locationCode - 集計対象教室コード
     * @returns {Object} - 集計結果オブジェクト
     */
    makeMonthTotal(fromDate: MyDate, toDate: MyDate, locationCode: string): {} {
        const monthTotal: { [s: string]: { [s: string]: number } } = {};
        const loopDate = new MyDate(fromDate);
        while (loopDate <= toDate) {
            if (this.imp_click[locationCode]) {
                if (!monthTotal[loopDate.getFormattedString('YYYY年M月')]) {
                    monthTotal[loopDate.getFormattedString('YYYY年M月')] = {
                        imp: 0,
                        click: 0,
                    };
                }
                if (this.imp_click[locationCode][loopDate.getDateString('-')]) {
                    monthTotal[loopDate.getFormattedString('YYYY年M月')].imp += this.imp_click[locationCode][
                        loopDate.getDateString('-')
                    ].imp;
                    monthTotal[loopDate.getFormattedString('YYYY年M月')].click += this.imp_click[locationCode][
                        loopDate.getDateString('-')
                    ].click;
                }
            }
            loopDate.addDay();
        }
        return monthTotal;
    }
}
