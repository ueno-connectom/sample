import MyDate from '../MyDate';
import MyLogger from '../MyLogger';
import Postgresql from '../Postgresql';
const Logger = MyLogger.getLogger();
/**
 * adService の imp/click データクラス
 */
export default class AdServiceData {
    public creatives: string[];
    public imp_click: {
        [s: string]: {
            [s: string]: {
                imp: number;
                click: number;
            };
        };
    };
    public dbConnection: Postgresql;
    public filled: boolean;

    /**
     * コンストラクタ
     * @param {Postgresql} dbConnection - データベース接続オブジェクト (pg)
     */
    constructor(dbConnection: Postgresql) {
        this.creatives = [];
        this.imp_click = {};
        this.dbConnection = dbConnection;
        this.filled = false;
    }
    /**
     * データベースから imp/click データを取得する
     * @param {string} campaignID - adService キャンペーン ID
     * @param {Date} fromDate - 集計開始日
     * @param {Date} toDate - 集計終了日
     * @returns {boolean} - 成功の場合 真
     * @async
     */
    async fetchData(campaignID: string, fromDate: MyDate, toDate: MyDate) {
        if (!campaignID || !fromDate || !toDate) {
            Logger.error(
                `ERROR: AdServiceData.fetchData / not enough parameters / campaignID: '${campaignID}', fromDate: ${fromDate}, toDate: ${toDate}`
            );
            throw new Error(
                `ERROR: AdServiceData.fetchData / not enough parameters / campaignID: '${campaignID}', fromDate: ${fromDate}, toDate: ${toDate}`
            );
        }
        campaignID = campaignID.replace(/'/g, '');
        campaignID = campaignID.replace(/[,|]/g, "','");
        const impclickSQL = `
            SELECT
                creative_name, 
                external_location_id, 
                location_name, 
                sum(imp) AS imp, 
                sum(click) AS click 
            FROM (
                SELECT
                    coalesce(creatives.name, '') AS creative_name, 
                    trans.location_id AS location_id, 
                    locations.external_location_id, 
                    coalesce(locations.name, '') AS location_name, 
                    trans.imp AS imp, 
                    trans.click AS click 
                FROM
                ( 
                    SELECT
                        coalesce(imp_g.creative_id, click_g.creative_id) AS creative_id, 
                        coalesce(imp_g.location_id, click_g.location_id) AS location_id, 
                        coalesce(imp, 0) AS imp, 
                        coalesce(click, 0) AS click 
                    FROM
                    ( 
                        SELECT
                            creative_id, 
                            location_id, 
                            count(*) AS imp 
                        FROM
                            imp_logs 
                        WHERE
                            created_at BETWEEN convert_timezone('JST', 'UTC', '${fromDate.getFormattedString(
                                'YYYY-MM-DD'
                            )} 00:00:00')
                                AND convert_timezone('JST', 'UTC', '${toDate.getFormattedString(
                                    'YYYY-MM-DD'
                                )} 23:59:59.999')
                            AND campaign_id IN ('${campaignID}') 
                            AND remote_ip NOT IN ('124.39.122.115', '39.110.206.88', '52.196.148.167', '220.156.92.228') 
                        GROUP BY
                            1, 
                            2
                    ) AS imp_g 
                    FULL OUTER JOIN ( 
                        SELECT
                            creative_id, 
                            location_id, 
                            count(*) AS click 
                        FROM
                            click_logs 
                        WHERE
                        created_at BETWEEN convert_timezone('JST', 'UTC', '${fromDate.getFormattedString(
                            'YYYY-MM-DD'
                        )} 00:00:00')
                            AND convert_timezone('JST', 'UTC', '${toDate.getFormattedString(
                                'YYYY-MM-DD'
                            )} 23:59:59.999')
                        AND campaign_id IN ('${campaignID}') 
                        AND remote_ip NOT IN ('124.39.122.115', '39.110.206.88', '52.196.148.167', '220.156.92.228') 
                        GROUP BY
                            1, 
                            2
                    ) AS click_g 
                        ON imp_g.creative_id = click_g.creative_id 
                        AND imp_g.location_id = click_g.location_id
                ) AS trans 
                LEFT OUTER JOIN creatives 
                    ON trans.creative_id = creatives.id 
                LEFT OUTER JOIN locations 
                    ON trans.location_id = locations.id 
            ) v
            GROUP BY
                creative_name, external_location_id, location_name
            ORDER BY
                external_location_id ASC, 
                creative_name ASC;
        `;
        const creativesSQL = `
            SELECT DISTINCT creatives.name 
            FROM creatives INNER JOIN ads ON creatives.ad_id = ads.id
            WHERE ads.campaign_id IN ('${campaignID}') 
            ORDER BY name ASC;
        `;
        let result;

        Logger.debug('AdServiceData: open connection');
        try {
            await this.dbConnection.connect();
            Logger.trace(`AdServiceData: connected: ${this.dbConnection.connected}`);

            // imp click
            if (this.dbConnection.connected) {
                Logger.debug(
                    `AdServiceData: query campaign '${campaignID}' from ${fromDate.getFormattedString(
                        'YYYY-MM-DD'
                    )} to ${toDate.getFormattedString('YYYY-MM-DD')}`
                );
                result = await this.dbConnection.query(impclickSQL);
            }
            if (result) {
                for (const row of result.rows) {
                    if (!row['creative_name']) {
                        continue;
                    }
                    if (typeof this.imp_click[row['external_location_id']] === 'undefined') {
                        this.imp_click[row['external_location_id']] = {};
                    }
                    this.imp_click[row['external_location_id']][row['creative_name']] = {
                        imp: parseInt(row['imp']),
                        click: parseInt(row['click']),
                    };
                }
                this.filled = true;
            }

            // creatives list
            if (this.dbConnection.connected) {
                Logger.debug('AdServiceData query creatives');
                Logger.trace(`AdServiceData creativesSQL: ${creativesSQL}`);
                result = await this.dbConnection.query(creativesSQL);
            }

            if (result) {
                for (const row of result.rows) {
                    this.creatives.push(row['name']);
                }
            }
        } catch (err) {
            Logger.error(
                `AdServiceData.fetchData / campaignID: '${campaignID}', fromDate: ${fromDate}, toDate: ${toDate}\n${err}`
            );
            throw err;
        } finally {
            if (this.dbConnection.connected) {
                Logger.debug('AdServiceData: close connection');
                await this.dbConnection.close();
            }
        }

        Logger.debug('AdServiceData: done');
        return this.filled;
    }
}
