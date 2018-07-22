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

    start(): void {
        this.display.opacity = 0;
        wx.onMessage(data => {
            let command: string = data.command;
            switch (command) {
                case 'DisplayFriendsScore': {
                    this.refreshFriendScore();
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
            }
        });
    }

    refreshFriendScore(): void {
        wx.getFriendCloudStorage({
            keyList: ['score'],
            success: res => {
                this.friendScoreContent.removeAllChildren();

                let dataList: PersonData[] = res.data;

                // sort dataList
                dataList.sort((lhs, rhs) => {
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

                let padding: number = 10;
                let height: number = 100;
                let startingY: number = -100;

                this.friendScoreContent.height = dataList.length * (padding + height) + 100;
                for (let i: number = 0; i < dataList.length; i++) {
                    let item: cc.Node = cc.instantiate(this.playerScorePrefab);
                    item.setPositionX(0);
                    item.setPositionY(startingY - i * (padding + height));
                    console.log(item.getChildByName('Avatar').getComponent<cc.Sprite>(cc.Sprite));

                    cc.loader.load(
                        { url: dataList[i].avatarUrl, type: 'jpg' },
                        (err, tex) => {
                            item.getChildByName('Avatar').
                                getComponent<cc.Sprite>(cc.Sprite).spriteFrame = new cc.SpriteFrame(tex);
                        }
                    );

                    // setup rank label, name label and score label
                    let obj: ScoreData = JSON.parse(dataList[i].KVDataList[0].value);
                    item.getChildByName('RankLabel').getComponent<cc.Label>(cc.Label).string = `${i + 1}`;
                    item.getChildByName('NameLabel').getComponent<cc.Label>(cc.Label).string = dataList[i].nickname;
                    item.getChildByName('ScoreLabel').getComponent<cc.Label>(cc.Label).string =
                        `${(100 * obj.percentage).toFixed(1)}%  ${obj.nKill}杀`;

                    this.friendScoreContent.addChild(item);
                }
            }
        });
    }
}