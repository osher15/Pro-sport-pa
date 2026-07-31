"use strict";
/* ============================================================
   מקודד QR מינימלי — מצב בייטים (UTF-8), רמת תיקון שגיאות M,
   גרסאות 1–13. עצמאי לגמרי, בלי ספריות חיצוניות.
   window.HMQR.matrix(text) -> מערך דו־ממדי של true/false
   window.HMQR.draw(canvas,text,opts)
   ============================================================ */
window.HMQR=(function(){

  /* ---------- שדה גלואה GF(256) ---------- */
  const EXP=new Uint8Array(512), LOG=new Uint8Array(256);
  (function(){ let x=1;
    for(let i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&0x100)x^=0x11d; }
    for(let i=255;i<512;i++)EXP[i]=EXP[i-255];
  })();
  const mul=(a,b)=>(a&&b)?EXP[LOG[a]+LOG[b]]:0;

  function rsGen(n){
    let g=[1];
    for(let i=0;i<n;i++){
      const ng=new Array(g.length+1).fill(0);
      /* אינדקס 0 = המקדם של החזקה הגבוהה ביותר:
         הכפלה ב-x נשארת באינדקס j, והכפלה ב-α^i יורדת ל-j+1 */
      for(let j=0;j<g.length;j++){ ng[j]^=g[j]; ng[j+1]^=mul(g[j],EXP[i]); }
      g=ng;
    }
    return g;
  }
  function rsEncode(data,n){
    const g=rsGen(n), res=new Array(n).fill(0);
    for(const b of data){
      const f=b^res[0];
      res.shift(); res.push(0);
      if(f)for(let i=0;i<n;i++)res[i]^=mul(g[i+1],f);
    }
    return res;
  }

  /* ---------- טבלאות גרסה (רמת M בלבד) ----------
     [סה״כ קודי־מילה, ECC לבלוק, בלוקים בקבוצה 1, בלוקים בקבוצה 2] */
  const VER={
    1:[26,10,1,0],   2:[44,16,1,0],   3:[70,26,1,0],   4:[100,18,2,0],
    5:[134,24,2,0],  6:[172,16,4,0],  7:[196,18,4,0],  8:[242,22,2,2],
    9:[292,22,3,2], 10:[346,26,4,1], 11:[404,30,1,4], 12:[466,22,6,2],
    13:[532,22,8,1]
  };
  /* קיבולת נתונים במצב בייטים לכל גרסה ברמת M */
  const CAP={1:14,2:26,3:42,4:62,5:84,6:106,7:122,8:152,9:180,10:213,11:251,12:287,13:331};

  const ALIGN={1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],
    7:[6,22,38],8:[6,24,42],9:[6,26,46],10:[6,28,50],11:[6,30,54],
    12:[6,32,58],13:[6,34,62]};

  function utf8(s){
    const out=[];
    for(const ch of unescape(encodeURIComponent(s)))out.push(ch.charCodeAt(0));
    return out;
  }

  /* ---------- בניית זרם הביטים ---------- */
  function buildData(bytes,ver){
    const [total,eccPer,g1,g2]=VER[ver];
    const blocks=g1+g2;
    const dataCw=total-eccPer*blocks;
    const bits=[];
    const push=(v,n)=>{ for(let i=n-1;i>=0;i--)bits.push((v>>i)&1); };
    push(4,4);                                   /* מצב בייטים */
    push(bytes.length, ver<10?8:16);             /* אורך */
    bytes.forEach(b=>push(b,8));
    /* מחוון סיום + ריפוד לגבול בייט */
    for(let i=0;i<4&&bits.length<dataCw*8;i++)bits.push(0);
    while(bits.length%8)bits.push(0);
    const cw=[];
    for(let i=0;i<bits.length;i+=8){
      let v=0; for(let j=0;j<8;j++)v=(v<<1)|bits[i+j];
      cw.push(v);
    }
    const PAD=[0xEC,0x11]; let k=0;
    while(cw.length<dataCw)cw.push(PAD[k++%2]);

    /* חלוקה לבלוקים: g2 בלוקים ארוכים ב-1 מ-g1 */
    const shortLen=Math.floor(dataCw/blocks);
    const dBlocks=[],eBlocks=[];
    let p=0;
    for(let i=0;i<blocks;i++){
      const len=shortLen+(i>=g1?1:0);
      const d=cw.slice(p,p+len); p+=len;
      dBlocks.push(d); eBlocks.push(rsEncode(d,eccPer));
    }
    /* שזירה */
    const out=[];
    const maxD=Math.max(...dBlocks.map(b=>b.length));
    for(let i=0;i<maxD;i++)for(const b of dBlocks)if(i<b.length)out.push(b[i]);
    for(let i=0;i<eccPer;i++)for(const b of eBlocks)out.push(b[i]);
    return out;
  }

  /* ---------- מטריצה ---------- */
  function newMatrix(size){
    const m=[],r=[];
    for(let i=0;i<size;i++){ m.push(new Array(size).fill(null)); r.push(new Array(size).fill(false)); }
    return {m,r};
  }
  function placeFinder(m,r,size,row,col){
    for(let dy=-1;dy<=7;dy++)for(let dx=-1;dx<=7;dx++){
      const y=row+dy,x=col+dx;
      if(y<0||y>=size||x<0||x>=size)continue;
      const inner=(dy>=0&&dy<=6&&dx>=0&&dx<=6);
      const on=inner&&((dy===0||dy===6||dx===0||dx===6)||(dy>=2&&dy<=4&&dx>=2&&dx<=4));
      m[y][x]=on; r[y][x]=true;
    }
  }
  function buildMatrix(ver,codewords,mask){
    const size=ver*4+17;
    const {m,r}=newMatrix(size);
    placeFinder(m,r,size,0,0);
    placeFinder(m,r,size,0,size-7);
    placeFinder(m,r,size,size-7,0);
    /* טיימינג */
    for(let i=8;i<size-8;i++){
      m[6][i]=(i%2===0); r[6][i]=true;
      m[i][6]=(i%2===0); r[i][6]=true;
    }
    /* דפוסי יישור */
    const al=ALIGN[ver];
    for(const ay of al)for(const ax of al){
      if((ay<=8&&ax<=8)||(ay<=8&&ax>=size-9)||(ay>=size-9&&ax<=8))continue;
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
        m[ay+dy][ax+dx]=(Math.max(Math.abs(dy),Math.abs(dx))!==1);
        r[ay+dy][ax+dx]=true;
      }
    }
    /* מודול כהה קבוע */
    m[size-8][8]=true; r[size-8][8]=true;
    /* שריון אזור מידע הפורמט */
    for(let i=0;i<9;i++){ if(!r[8][i]){m[8][i]=false;r[8][i]=true;} if(!r[i][8]){m[i][8]=false;r[i][8]=true;} }
    for(let i=0;i<8;i++){ if(!r[8][size-1-i]){m[8][size-1-i]=false;r[8][size-1-i]=true;}
                          if(!r[size-1-i][8]){m[size-1-i][8]=false;r[size-1-i][8]=true;} }
    /* מידע גרסה — נדרש מגרסה 7 ומעלה */
    if(ver>=7){
      let rem=ver;
      for(let i=0;i<12;i++)rem=(rem<<1)^((rem>>>11)*0x1F25);
      const vb=(ver<<12)|rem;
      for(let i=0;i<18;i++){
        const bit=((vb>>i)&1)===1, a=size-11+i%3, b=Math.floor(i/3);
        m[b][a]=bit; r[b][a]=true;   /* פינה ימנית עליונה */
        m[a][b]=bit; r[a][b]=true;   /* פינה שמאלית תחתונה */
      }
    }

    /* נתונים בזיגזג */
    let bi=0;
    const bitAt=i=>(i>>3)<codewords.length?((codewords[i>>3]>>(7-(i&7)))&1):0;
    let up=true;
    for(let col=size-1;col>0;col-=2){
      if(col===6)col--;
      for(let n=0;n<size;n++){
        const row=up?size-1-n:n;
        for(let c=0;c<2;c++){
          const x=col-c;
          if(r[row][x])continue;
          let v=bitAt(bi++)===1;
          if(maskFn(mask,row,x))v=!v;
          m[row][x]=v;
        }
      }
      up=!up;
    }
    /* מידע פורמט: רמה M = 00. הקואורדינטות הן [שורה][עמודה]. */
    const fmt=formatBits(0,mask);
    for(let i=0;i<15;i++){
      const b=((fmt>>i)&1)===1;
      /* עותק ראשון — סביב הפינה השמאלית העליונה */
      if(i<6)m[i][8]=b;
      else if(i===6)m[7][8]=b;
      else if(i===7)m[8][8]=b;
      else if(i===8)m[8][7]=b;
      else m[8][14-i]=b;
      /* עותק שני — מפוצל בין ימין למטה */
      if(i<8)m[8][size-1-i]=b;
      else m[size-15+i][8]=b;
    }
    return m;
  }
  function maskFn(k,i,j){
    switch(k){
      case 0:return (i+j)%2===0;
      case 1:return i%2===0;
      case 2:return j%3===0;
      case 3:return (i+j)%3===0;
      case 4:return (Math.floor(i/2)+Math.floor(j/3))%2===0;
      case 5:return (i*j)%2+(i*j)%3===0;
      case 6:return ((i*j)%2+(i*j)%3)%2===0;
      default:return ((i+j)%2+(i*j)%3)%2===0;
    }
  }
  function formatBits(ec,mask){
    const data=(ec<<3)|mask;
    let v=data<<10;
    for(let i=4;i>=0;i--)if(v&(1<<(i+10)))v^=0x537<<i;
    return ((data<<10)|v)^0x5412;
  }

  /* ---------- ניקוד עונשין לבחירת מסכה ---------- */
  function penalty(m){
    const n=m.length; let p=0;
    const run=line=>{ let s=0,c=1;
      for(let i=1;i<n;i++){ if(line[i]===line[i-1])c++; else {if(c>=5)s+=c-2;c=1;} }
      if(c>=5)s+=c-2; return s; };
    for(let i=0;i<n;i++){ p+=run(m[i]); p+=run(m.map(r=>r[i])); }
    for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++){
      const a=m[i][j];
      if(a===m[i][j+1]&&a===m[i+1][j]&&a===m[i+1][j+1])p+=3;
    }
    const pat=[true,false,true,true,true,false,true,false,false,false,false];
    const hit=(arr,s)=>{ for(let k=0;k<11;k++)if(arr[s+k]!==pat[k])return false; return true; };
    for(let i=0;i<n;i++){
      const row=m[i], col=m.map(r=>r[i]);
      for(let j=0;j+11<=n;j++){ if(hit(row,j))p+=40; if(hit(col,j))p+=40; }
    }
    let dark=0; m.forEach(r=>r.forEach(v=>{if(v)dark++;}));
    p+=Math.floor(Math.abs(dark*100/(n*n)-50)/5)*10;
    return p;
  }

  function matrix(text){
    const bytes=utf8(text);
    let ver=0;
    for(let v=1;v<=13;v++)if(bytes.length<=CAP[v]){ver=v;break;}
    if(!ver)throw new Error("הטקסט ארוך מדי ל-QR (עד "+CAP[13]+" בייטים)");
    const cw=buildData(bytes,ver);
    let best=null,bestP=Infinity;
    for(let k=0;k<8;k++){
      const m=buildMatrix(ver,cw,k), p=penalty(m);
      if(p<bestP){bestP=p;best=m;}
    }
    return best;
  }

  function draw(canvas,text,opts){
    opts=opts||{};
    const m=matrix(text), n=m.length;
    const quiet=opts.quiet==null?4:opts.quiet;
    const scale=opts.scale||Math.max(2,Math.floor((opts.size||280)/(n+quiet*2)));
    const px=(n+quiet*2)*scale;
    canvas.width=px; canvas.height=px;
    const c=canvas.getContext("2d");
    c.fillStyle=opts.bg||"#ffffff"; c.fillRect(0,0,px,px);
    c.fillStyle=opts.fg||"#000000";
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)
      if(m[y][x])c.fillRect((x+quiet)*scale,(y+quiet)*scale,scale,scale);
    return canvas;
  }

  return {matrix,draw};
})();
