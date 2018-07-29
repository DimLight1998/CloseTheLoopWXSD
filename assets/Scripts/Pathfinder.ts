const { ccclass, property } = cc._decorator;

class KVDataListItem {
    key: string;
    value: string;
}

class PersonData {
    KVDataList: KVDataListItem[];
    avatarUrl: string;
    nickname: string;
    openid: string;
}

class ScoreData {
    percentage: number;
    nKill: number;
    timestamp: number;
}

@ccclass
export default class Pathfinder extends cc.Component {
    @property(cc.Node)
    display: cc.Node = null;

    @property(cc.Node)
    friendScoreContent: cc.Node = null;

    @property(cc.Prefab)
    playerScorePrefab: cc.Prefab = null;

    currentPage: number = 0;
    maxPage: number = 0;

    dataList: PersonData[] = null;
    itemsPerPage: number = 6;

    start(): void {
        this.display.opacity = 0;
        wx.onMessage(data => {
            let command: string = data.command;
            switch (command) {
                case 'DisplayFriendsScore': {
                    this.refreshFriendScore();
                    this.currentPage = 0;
                    this.display.opacity = 255;
                    break;
                }
                case 'HideFriendsScore': {
                    this.display.opacity = 0;
                    break;
                }
                case 'UpdatePlayerScore': {
                    let score: number = data.param1;
                    let nKill: number = data.param2;
                    wx.getUserCloudStorage({
                        keyList: ['score'],
                        success: res => {
                            let obj: any = null;
                            if (res.KVDataList.length > 0) {
                                obj = JSON.parse(res.KVDataList[0].value);
                            }
                            if (res.KVDataList.length === 0 || // this user had no data before
                                score > obj.percentage || // this user broke his record
                                (score === obj.percentage && nKill < obj.nKill) // this user didn't break his record
                            ) {
                                wx.setUserCloudStorage({
                                    KVDataList: [
                                        {
                                            key: 'score',
                                            value: JSON.stringify(
                                                { percentage: score, nKill: nKill, timestamp: Date.now() }
                                            )
                                        }
                                    ]
                                });
                            }
                        },
                        fail: () => {
                            console.log('fail');
                        }
                    });
                    break;
                }
                case 'NextPage': {
                    if (this.currentPage === this.maxPage) {
                        break;
                    } else {
                        this.toPage(this.currentPage + 1);
                        this.currentPage++;
                    }
                    break;
                }
                case 'PrevPage': {
                    if (this.currentPage === 0) {
                        break;
                    } else {
                        this.toPage(this.currentPage - 1);
                        this.currentPage--;
                    }
                    break;
                }
            }
        });
    }

    /**
     * Will update `maxPage`.
     */
    refreshFriendScore(): void {
        wx.getFriendCloudStorage({
            keyList: ['score'],
            success: res => {
                this.dataList = res.data;

                // sort dataList
                this.dataList.sort((lhs, rhs) => {
                    let lhsObj: ScoreData = JSON.parse(lhs.KVDataList[0].value);
                    let rhsObj: ScoreData = JSON.parse(rhs.KVDataList[0].value);
                    if (lhsObj.percentage !== rhsObj.percentage) {
                        return rhsObj.percentage - lhsObj.percentage;
                    } else if (lhsObj.nKill !== rhsObj.nKill) {
                        return lhsObj.nKill - rhsObj.nKill;
                    } else {
                        return lhsObj.timestamp - rhsObj.timestamp;
                    }
                });

                if (this.dataList.length === 0) {
                    this.maxPage = 0;
                } else {
                    this.maxPage = Math.floor((this.dataList.length - 1) / this.itemsPerPage);
                }

                this.toPage(0);
            }
        });
    }

    /**
     * Switch to a page.
     */
    toPage(page: number): void {
        this.friendScoreContent.removeAllChildren();
        let base: number = -60;
        let height: number = -120;

        for (let i: number = 0; i < this.itemsPerPage; i++) {
            let idx: number = this.itemsPerPage * page + i;
            if (idx < this.dataList.length) {
                let item: cc.Node = cc.instantiate(this.playerScorePrefab);
                item.setPositionX(0);
                item.setPositionY(base + i * height);
                cc.loader.load(
                    { url: this.dataList[idx].avatarUrl, type: 'jpg' },
                    (err, tex) => {
                        item.getChildByName('Avatar').
                            getComponent<cc.Sprite>(cc.Sprite).spriteFrame = new cc.SpriteFrame(tex);
                    }
                );

            // setup rank label, name label and score label
            let obj: ScoreData = JSON.parse(this.dataList[idx].KVDataList[0].value);
            item.getChildByName('RankLabel').getComponent<cc.Label>(cc.Label).string = `${idx + 1}`;
            item.getChildByName('NameLabel').getComponent<cc.Label>(cc.Label).string = this.dataList[idx].nickname;
            item.getChildByName('ScoreLabel').getComponent<cc.Label>(cc.Label).string =
                `${(100 * obj.percentage).toFixed(1)}%  ${obj.nKill}杀`;

            this.friendScoreContent.addChild(item);
            }
        }
    }
}