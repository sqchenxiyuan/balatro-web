export type Suit='S'|'H'|'C'|'D';
export type Enhancement='bonus'|'mult'|'wild'|'glass'|'steel'|'stone'|'gold'|'lucky';
export type Edition='foil'|'holographic'|'polychrome'|'negative';
export type Seal='gold'|'red'|'blue'|'purple';
export interface Card {id:string;rank:number;suit:Suit;enhancement?:Enhancement;edition?:Exclude<Edition,'negative'>;seal?:Seal;bonusChips?:number;debuffed?:boolean;faceDown?:boolean}
export const HANDS={
 high:{name:'高牌',chips:5,mult:1,chipStep:10,multStep:1,planet:'pluto',planetName:'冥王星',planetEn:'Pluto',hidden:false},
 pair:{name:'对子',chips:10,mult:2,chipStep:15,multStep:1,planet:'mercury',planetName:'水星',planetEn:'Mercury',hidden:false},
 two_pair:{name:'两对',chips:20,mult:2,chipStep:20,multStep:1,planet:'uranus',planetName:'天王星',planetEn:'Uranus',hidden:false},
 three:{name:'三条',chips:30,mult:3,chipStep:20,multStep:2,planet:'venus',planetName:'金星',planetEn:'Venus',hidden:false},
 straight:{name:'顺子',chips:30,mult:4,chipStep:30,multStep:3,planet:'saturn',planetName:'土星',planetEn:'Saturn',hidden:false},
 flush:{name:'同花',chips:35,mult:4,chipStep:15,multStep:2,planet:'jupiter',planetName:'木星',planetEn:'Jupiter',hidden:false},
 full_house:{name:'葫芦',chips:40,mult:4,chipStep:25,multStep:2,planet:'earth',planetName:'地球',planetEn:'Earth',hidden:false},
 four:{name:'四条',chips:60,mult:7,chipStep:30,multStep:3,planet:'mars',planetName:'火星',planetEn:'Mars',hidden:false},
 straight_flush:{name:'同花顺',chips:100,mult:8,chipStep:40,multStep:4,planet:'neptune',planetName:'海王星',planetEn:'Neptune',hidden:false},
 five:{name:'五条',chips:120,mult:12,chipStep:35,multStep:3,planet:'planet_x',planetName:'X行星',planetEn:'Planet X',hidden:true},
 flush_house:{name:'同花葫芦',chips:140,mult:14,chipStep:40,multStep:4,planet:'ceres',planetName:'谷神星',planetEn:'Ceres',hidden:true},
 flush_five:{name:'同花五条',chips:160,mult:16,chipStep:50,multStep:3,planet:'eris',planetName:'阋神星',planetEn:'Eris',hidden:true},
} as const;
export type HandKey=keyof typeof HANDS;
export type HandLevels=Record<HandKey,number>;
export const initialLevels=():HandLevels=>Object.fromEntries(Object.keys(HANDS).map(k=>[k,1])) as HandLevels;
export interface Evaluation {key:HandKey;name:string;chips:number;mult:number;level:number;scoring:string[]}
export const cardChips=(card:Card)=>(card.enhancement==='stone'?50:(card.rank===14?11:Math.min(10,card.rank))+(card.enhancement==='bonus'?30:0))+(card.bonusChips??0);
export const rankName=(rank:number)=>({14:'A',13:'K',12:'Q',11:'J'}[rank]??String(rank));
export const assetFor=(card:Card)=>`card-${card.suit}-${rankName(card.rank)}.png`;
export const suitName={S:'黑桃',H:'红桃',C:'梅花',D:'方块'};
export const hasSuit=(card:Card,suit:Suit)=>card.enhancement!=='stone'&&(card.enhancement==='wild'||card.suit===suit);
export function evaluate(cards:Card[],levels:HandLevels=initialLevels()):Evaluation {
 if(!cards.length)return {key:'high',name:'选择手牌',chips:0,mult:0,level:1,scoring:[]};
 const valid=cards.filter(c=>c.enhancement!=='stone'),groups=new Map<number,Card[]>();
 for(const c of valid)groups.set(c.rank,[...(groups.get(c.rank)??[]),c]);
 const ordered=[...groups.values()].sort((a,b)=>b.length-a.length||b[0].rank-a[0].rank),ranks=[...groups.keys()].sort((a,b)=>a-b);
 const flush=valid.length===5&&(['S','H','C','D'] as Suit[]).some(s=>valid.every(c=>hasSuit(c,s)));
 const straight=valid.length===5&&ranks.length===5&&(ranks[4]-ranks[0]===4||ranks.join(',')==='2,3,4,5,14');
 const n=ordered[0]?.length??0,house=n===3&&ordered[1]?.length===2;
 let key:HandKey='high',scoring=valid.length?[...valid].sort((a,b)=>b.rank-a.rank).slice(0,1):[];
 if(flush&&n===5){key='flush_five';scoring=valid;}
 else if(flush&&house){key='flush_house';scoring=valid;}
 else if(n===5){key='five';scoring=valid;}
 else if(straight&&flush){key='straight_flush';scoring=valid;}
 else if(n===4){key='four';scoring=ordered[0];}
 else if(house){key='full_house';scoring=valid;}
 else if(flush){key='flush';scoring=valid;}
 else if(straight){key='straight';scoring=valid;}
 else if(n===3){key='three';scoring=ordered[0];}
 else if(n===2&&ordered[1]?.length===2){key='two_pair';scoring=[...ordered[0],...ordered[1]];}
 else if(n===2){key='pair';scoring=ordered[0];}
 const h=HANDS[key],level=levels[key];return {key,name:h.name,chips:h.chips+(level-1)*h.chipStep,mult:h.mult+(level-1)*h.multStep,level,scoring:cards.filter(c=>scoring.includes(c)||c.enhancement==='stone').map(c=>c.id)};
}
export const initialHand=():Card[]=>[{id:'h-10',rank:10,suit:'H'},{id:'c-10',rank:10,suit:'C'},{id:'s-A',rank:14,suit:'S'},{id:'d-K',rank:13,suit:'D'},{id:'h-Q',rank:12,suit:'H'},{id:'s-8',rank:8,suit:'S'},{id:'d-5',rank:5,suit:'D'},{id:'c-3',rank:3,suit:'C'}];
