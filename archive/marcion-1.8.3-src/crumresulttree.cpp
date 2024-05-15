/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "crumresulttree.h"
#include "cwordtemplate.h"

CCrumResultTree::CCrumResultTree(QWidget * parent)
    :QTreeWidget(parent),
      messages(0),
      toolTip(),
      last(0),
      _show_tooltips(false),
      _searched_text()
{
    toolTip.setWindowFlags(Qt::ToolTip);
    toolTip.setFocusPolicy(Qt::NoFocus);
    //toolTip.setFont(m_sett()->font(CTranslit::Copt));
}

bool CCrumResultTree::event(QEvent * e)
{
    if(_show_tooltips)
        switch(e->type())
        {
        //case QEvent::MouseButtonPress :
        //case QEvent::MouseButtonDblClick :
        //case QEvent::MouseButtonRelease :
        case QEvent::Move :
        case QEvent::Resize :
        case QEvent::FocusOut :
        case QEvent::FocusIn :
        case QEvent::Leave :
        case QEvent::Hide :
            last=0;
            toolTip.hide();
            return QTreeWidget::event(e);
            break;
        case QEvent::ToolTip :
        {
            QHelpEvent * he=(QHelpEvent*)e;
            CResultItem * i((CResultItem*)itemAt(he->pos()));
            if(i&&i!=last)
            {
                last=i;
                //toolTip.hide();
                if(i->tooltip.isEmpty())
                    toolTip.hide();
                else
                {
                    toolTip.setText(i->tooltip);
                    toolTip.repaint();
                    toolTip.move(QPoint(he->globalX()+10,he->globalY()));
                    toolTip.show();
                }
                e->accept();
                return true;
            }
            else if(!i)
            {
                last=0;
                toolTip.hide();
            }
            break;
        }
        default:
            return QTreeWidget::event(e);
            break;
        }

    return QTreeWidget::event(e);
}

void CCrumResultTree::init(CMessages * const messages/*,
                           CWordPreview * word_pr,
                           QString (CWordPreview::*p_format)(QString const &)const*/)
{
    CMessages ** m=(CMessages**)&this->messages;
    *m=*(CMessages**)&messages;
    /*pfmt=p_format;
    wpr=word_pr;*/
}

void CCrumResultTree::setShowToolTips(bool show_tooltips)
{
    _show_tooltips=show_tooltips;
    if(!_show_tooltips)
    {
        last=0;
        toolTip.hide();
    }
}

void CCrumResultTree::setToolTipFont(QFont const & font)
{
    last=0;
    toolTip.hide();
    toolTip.setFont(font);
}

void CCrumResultTree::hideToolTip()
{
    last=0;
    toolTip.hide();
}

void CCrumResultTree::createIndex()
{
    CProgressDialog pd;
    pd.show();

    QString query1("truncate table `crum_index`");
    MQUERY(q1,query1);

    QString query3("select `key`,`word`,`type` from `coptwrd`");
    MQUERY(q3,query3);

    QString query2("select `key`,`key_word`,`pos`,`word`,`type` from `coptdrv`");
    MQUERY(q2,query2);

    messages->setMsgDisabled(true);

    pd.initProgress(tr("building index ..."),q3.size()+q2.size());
    //messages->prepPBar(q3.size()+q2.size());

    QString warns;
    unsigned int count=0,wcount=0;
    while(q3.next())
    {
        int key=q3.value(0).toInt();
        QString wrd(q3.value(1));
        unsigned short t(q3.value(2).toUShort());
        CWordItem const wi(key,
                     0,
                     0,
                     wrd,
                     QString(),
                     CWordItem::Word,
                     t);

        showInTree(&wi,CResultItem::Wrd,false);
        CResultItem * ri=itemByKey(key,CResultItem::Wrd);

        QList<CWPair> const l=ri->resolveItem();
        if(ri->cwitem.warnings>0&&t!=99)
            warns.append("warning "+QString::number(++wcount)+": D, key ["+QString::number(key)+"], code ["+QString::number(ri->cwitem.warnings)+"], word: "+wrd+"<br>");
        if(ri->cwitem.wlist_resolved.count()==0&&t!=99)
            warns.append("warning "+QString::number(++wcount)+": D, key ["+QString::number(key)+"], code [99], word: "+wrd+"<br>");

        QRegExp r("[^a-zA-Z]");
        for(int x=0;x<l.count();x++)
        {
            QString d(QString::number(l[x].first));
            QString s(l[x].second);

            QString queryins("insert into `crum_index` (`key`,`wd`,`dialect`,`word`) values ("+QString::number(key)+",1,"+d+",'"+s.remove(r)+"')");
            MQUERY_ENABL_MSG(qins,queryins)
        }

        if(pd.stopped())
        {
            pd.close();
            messages->MsgInf(tr("progress interrupted"));
            return;
        }
        pd.incProgress();
        count++;
    }

    while(q2.next())
    {
        int key=q2.value(0).toInt();
        QString wrd(q2.value(3));
        unsigned short t(q2.value(4).toUShort());
        CWordItem const wi(key,
                     q2.value(1).toInt(),
                     q2.value(2).toInt(),
                     wrd,
                     QString(),
                     CWordItem::Derivation,
                     t);

        showInTree(&wi,CResultItem::Drv,false);
        CResultItem * ri=itemByKey(key,CResultItem::Drv);
        QList<CWPair> const l=ri->resolveItem();

        if(ri->cwitem.warnings>0&&t!=99)
            warns.append("warning "+QString::number(++wcount)+": D, key ["+QString::number(key)+"], code ["+QString::number(ri->cwitem.warnings)+"], word: "+wrd+"<br>");
        if(ri->cwitem.wlist_resolved.count()==0&&t!=99)
            warns.append("warning "+QString::number(++wcount)+": D, key ["+QString::number(key)+"], code [99], word: "+wrd+"<br>");

        QRegExp r("[^a-zA-Z]");
        for(int x=0;x<l.count();x++)
        {
            QString d(QString::number(l[x].first));
            QString s(l[x].second);

            QString queryins("insert into `crum_index` (`key`,`wd`,`dialect`,`word`) values ("+QString::number(key)+",2,"+d+",'"+s.remove(r)+"')");
            MQUERY_ENABL_MSG(qins,queryins)
        }

        if(pd.stopped())
        {
            pd.close();
            messages->MsgInf(tr("progress interrupted"));
            return;
        }
        pd.incProgress();
        count++;
    }
    messages->setMsgDisabled(false);

    messages->MsgMsg(warns);
    messages->MsgMsg("Warnings: "+QString::number(wcount));
    messages->MsgMsg("Records: "+QString::number(count));
    messages->MsgOk();

    pd.close();
}

void CCrumResultTree::showInTree(CWordItem const * wi,CResultItem::Type type,bool clear)
{
    if(clear)
        CCrumResultTree::clear();

    if(itemByKey(wi->key(),type))
        return;

    unsigned int key(0);
    switch(type)
    {
    case CResultItem::Wrd :
        key=wi->key();
        break;
    case CResultItem::Drv :
        key=wi->key_word();
        break;
    }

    QString k(QString::number(key));

    //QFont f(messages->settings().copticFont());
    //f.setPixelSize(messages->settings().copticFontSize());

    QRegExp re("<.+>"),re2("(<a href.+</a>)");
    re.setMinimal(true);
    re2.setMinimal(true);

    QString const
            fgc(m_sett()->HTfgColor()),
            bgc(m_sett()->HTbgColor());

    QString query("select `word`,`type`,`crum`,`quality`,`cz`,`en`,`gr` from `coptwrd` where `key`="+k);
    MQUERY_GETFIRST(q,query)

    QString const cwtext(q.value(0));
    CResultItem * i=new CResultItem(cwtext);

    i->key=key;
    i->setWord(trBrackets(cwtext),false);
    i->wtype=q.value(1).toUShort();
    i->crum=q.value(2);
    i->quality=q.value(3).toUShort();
    i->cz=q.value(4);
    i->en=q.value(5);
    i->gr=q.value(6);
    i->type=CResultItem::Wrd;

    i->tooltip=CTranslit::highlightCopDictWord(CWordTemplate::formatw(
                CTranslit::to(/*QString(*/trBrackets(cwtext).remove(re2)/*).remove(re2)*/,CTranslit::Copt)),_searched_text,fgc,bgc);

    i->setText(0,i->formatted_word.remove(re));
    i->setIcon(0,QIcon(":/new/icons/icons/uncheck.png"));

    addTopLevelItem(i);

    QString query2("select `word`,`type`,`crum`,`cz`,`en`,`gr`,`key_word`,`key_deriv`,`key` from `coptdrv` where `key_word`="+k+" order by `pos`");
    MQUERY(q2,query2)

    while(q2.next())
    {
        QString const cwtext(q2.value(0));
        CResultItem * di=new CResultItem(cwtext);

        di->setWord(trBrackets(cwtext),false);
        di->wtype=q2.value(1).toUShort();
        di->crum=q2.value(2);
        di->cz=q2.value(3);
        di->en=q2.value(4);
        di->gr=q2.value(5);
        di->word_key=q2.value(6).toUInt();
        di->deriv_key=q2.value(7).toUInt();
        di->type=CResultItem::Drv;
        di->key=q2.value(8).toUInt();



        if(di->wtype==99)
        {
            if(di->en.startsWith("tr"))
                di->cwitem.header=CWItem::Tr;
            else if(di->en.startsWith("intr"))
                di->cwitem.header=CWItem::Intr;
            else
                di->cwitem.header=CWItem::Other;

            QString const tt(convertHeaderText(di->en));
            di->tooltip=tt;
            di->setText(0,tt);
        }
        else
        {
            di->tooltip=CTranslit::highlightCopDictWord(CWordTemplate::formatw(
                        CTranslit::to(/*QString(*/trBrackets(cwtext).remove(re2)/*).remove(re2)*/,CTranslit::Copt)),_searched_text,fgc,bgc);
            di->setText(0,di->formatted_word.remove(re));
        }

        di->setIcon(0,QIcon(":/new/icons/icons/uncheck.png"));

        if(di->deriv_key>0)
        {
            CResultItem * ri=itemByKey(di->deriv_key,CResultItem::Drv);
            if(ri)
                ri->addChild(di);
        }
        else
            i->addChild(di);
    }
}

QString CCrumResultTree::convertHeaderText(QString const & header_text)
{
    QString s(header_text);
    QRegExp r("\\[.+\\]");
    r.setMinimal(true);

    int p=0;
    while((p=r.indexIn(s))!=-1)
    {
        QString sc(r.cap());
        int const scl=r.matchedLength();
        if(!sc.isEmpty())
        {
            sc.remove(0,1);
            sc.chop(1);
            sc=CTranslit::tr(sc,CTranslit::CopticDictC);
            s.replace(p,scl,sc);
        }

    }
    return s;
}

CResultItem * CCrumResultTree::itemByKey(unsigned int key, CResultItem::Type type)
{
    for(int x=0;x<topLevelItemCount();x++)
    {
        CResultItem * i((CResultItem *)topLevelItem(x));
        if(i->key==key&&i->type==type)
            return i;
        i=childByKey(key,type,i);
        if(i)
            return i;
    }

    return 0;
}

CResultItem * CCrumResultTree::childByKey(unsigned int key,CResultItem::Type type,QTreeWidgetItem * item)
{
    for(int x=0;x<item->childCount();x++)
    {
        CResultItem * i((CResultItem *)item->child(x));
        if(i->key==key&&i->type==type)
            return i;
        i=childByKey(key,type,i);
        if(i)
            return i;
    }
    return 0;
}

QString CCrumResultTree::trBrackets(QString const & str)
{
    QString ns(str);
    ns.replace("*^",QString(0x27E8));
    ns.replace("^*",QString(0x27E9));

    QRegExp r("\\"+QString(0x27E8)+".*\\"+QString(0x27E9));
    r.setMinimal(true);

    int i=-1,i2;
    while((i=r.indexIn(ns,i+1))!=-1)
    {
        i2=r.matchedLength();
        QString s(format(ns.mid(i+1,i2-2),true,false));
        ns.replace(i+1,i2-2,s);
    }
    return ns;
}

QString CCrumResultTree::format(QString const & str, bool greek, bool brackets)
{
    QString rv;
    QStringList lr(str.split("|",QString::KeepEmptyParts));

    for(int x=0;x<lr.count();x++)
    {
        QString r(lr.at(x).trimmed());
        if(r.isEmpty())
            r=QString("|");

        QRegExp re("\\[\\[.+\\]\\]"),re2("\\[.+\\]");
        re.setMinimal(true);
        re2.setMinimal(true);

        int f;
        while((f=re.indexIn(r))!=-1)
        {
            int l=re.matchedLength();
            QString ct(CTranslit::tr(r.mid(f,l).remove("[[").remove("]]"),CTranslit::GreekTrToGreekNcs,false,CTranslit::RemoveNone));
            r.replace(f,l,ct);
        }

        while((f=re2.indexIn(r))!=-1)
        {
            int l=re2.matchedLength();
            QString ct(CTranslit::tr(r.mid(f,l).remove("[").remove("]"),CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone));
            r.replace(f,l,ct);
        }

        r.replace("^+",QString(0x2720));
        r.replace("{","<b>").replace("}","</b>");
        r.replace("(","<i>").replace(")","</i>");
        r.replace("/*","(").replace("*/",")");
        r.replace("/$","[").replace("$/","]");
        r.replace("$",QString("&#x2015;"));

        if(brackets)
            r.prepend("<li>").append("</li>");
        rv.append(r);
    }

    if(brackets)
        rv.prepend("<ul style=\"list-style-type: circle;\">").append("</ul>");


    if(!greek)
    {
        QRegExp rgk("\\[gk:.*\\]");
        rgk.setMinimal(true);
        rv.remove(rgk);
    }

    return rv;
}

//

CWItem::CWItem(QString const & text)
    :wrds(),wlist(),wlist_resolved(),report(),header(No),resolved(false),warnings(0)
{
    parseText(text);
    stripFirstList(wrds);
}

bool CWItem::isSplitted() const
{
    return wlist.size()>0;
}

bool CWItem::isResolved() const
{
    return resolved;
}

void CWItem::stripFirstList(QList<CWPair> & l)
{
    QList<CWPair> l2;
    for(int x=0;x<l.count();x++)
    {
        int d=l[x].first;
        QString w=l[x].second;
        if(w.indexOf("$^")==-1)
        {
            l2.append(CWPair(d,w));
        }
        else
        {
            QRegExp r1("\\$\\^"),r2("\\^\\$"),r3("\\$\\^.+\\^\\$");
            r3.setMinimal(true);
            QString bw1(w);
            bw1.remove(r1);
            bw1.remove(r2);
            QString bw2(w);
            bw2.remove(r3);
            l2.append(CWPair(d,bw1));
            l2.append(CWPair(d,bw2));
        }
    }
    l=l2;
}

void CWItem::stripFirstWord(QString & word)
{
    QRegExp r2("\\*\\^.*\\^\\*");
        /*r3("\\$\\^"),
        r4("\\^\\$");*/
    r2.setMinimal(true);

    word.remove(r2);
    /*word.remove(r3);
    word.remove(r4);*/

    /*word.remove(QRegExp("^ +"));
    word.remove(QRegExp(" +$"));*/
    word=word.trimmed();
    while(word.indexOf("  ")!=-1)
        word.replace("  "," ");
}
void CWItem::stripFinalList()
{
    QRegExp r("[^a-zA-Z-+= ]");
        /*r2("\\*\\^.*\\^\\*");*/
        /*r3("\\$\\^"),
        r4("\\^\\$");*/
    //r2.setMinimal(true);
    for(int x=0;x<wlist_resolved.count();x++)
    {
      //  wlist_resolved[x].second.remove(r2);
        wlist_resolved[x].second.remove(r);
        //wlist_resolved[x].second.remove(r3);
        //wlist_resolved[x].second.remove(r4);
    }

}

/*bool CWItem::isCompete() const
{

}*/

int CWItem::dAsInt(int index) const
{
    return wlist[index].first;
}

QString CWItem::dAsStr(int index) const
{
    return dToStr(wlist[index].first);
}

QString CWItem::dToStr(int d)
{
    if(d==0)
        return QString("()");

    QString r("(");

    if(d&Sah)
        r.append("S,");
    if(d&SahA)
        r.append("Sa,");
    if(d&SahF)
        r.append("Sf,");
    if(d&Achm)
        r.append("A,");
    if(d&AchmSub)
        r.append("sA,");
    if(d&Boh)
        r.append("B,");
    if(d&Fay)
        r.append("F,");
    if(d&FayB)
        r.append("Fb,");
    if(d&Old)
        r.append("O,");
    if(d&NagHamm)
        r.append("NH,");

    r.chop(1);
    return r.append(")");
}

int CWItem::strToD(QString const & )
{
    return 0;
}

void CWItem::parseText(QString const & text)
{
        QString t(text);
        stripFirstWord(t);

        int r=0,lb=t.indexOf("("),rb;

        if(lb==-1)
        {
            wrds.append(CWPair(0,t.trimmed()));
            //wrds.append(text.trimmed());
            return;
        }
        while(lb!=-1)
        {
                rb=t.indexOf(")",lb);
                if(rb!=-1)
                {
                    int newd(0);

                        QString di(t.mid(lb+1,rb-lb-1));
                        QStringList di_l(di.split(",",QString::SkipEmptyParts));
                        for(int x=0;x<di_l.size();x++)
                        {
                                di_l[x]=di_l[x].trimmed();
                                if(di_l[x]=="S")
                                    newd|=Sah;
                                else if(di_l[x]=="Sa")
                                    newd|=SahA;
                                else if(di_l[x]=="Sf")
                                        newd|=SahF;
                                else if(di_l[x]=="A")
                                        newd|=Achm;
                                else if(di_l[x]=="sA")
                                        newd|=AchmSub;
                                else if(di_l[x]=="B")
                                        newd|=Boh;
                                else if(di_l[x]=="F")
                                        newd|=Fay;
                                else if(di_l[x]=="Fb")
                                        newd|=FayB;
                                else if(di_l[x]=="O")
                                        newd|=Old;
                                else if(di_l[x]=="NH")
                                        newd|=NagHamm;
                        }

                        wrds.append(CWPair(newd,QString()));
                        lb=t.indexOf("(",rb);
                        if(lb!=-1)
                            wrds.last().second=t.mid(rb+1,lb-rb-1).trimmed();
                        else
                            wrds.last().second=t.mid(rb+1).trimmed();

                        r++;
                }
                else return;
        }
}

// CResultItem

CResultItem::CResultItem(QString const & text):
    QTreeWidgetItem(QTreeWidgetItem::UserType),
    tooltip(),
    cwitem(text)
{
}

void CResultItem::setWord(QString const & word,bool brackets)
{
    CResultItem::word=word;
    formatted_word=CWordTemplate::formatw(CTranslit::tr(word,CTranslit::CopticDictC,false,CTranslit::RemoveNone),brackets);
}

CResultItem * CResultItem::parentItem(CWItem::Header * h)
{
    CResultItem * i=(CResultItem *)parent();
    if(i)
        if(i->cwitem.header!=CWItem::No)
        {
            *h=i->cwitem.header;
            return i->parentItem(h);
        }
    //*h=CWItem::No;
    return i;
}

/*CResultItem * CResultItem::topItem()
{
    CResultItem *ri,* i=this;
    while((ri=i,i->parentItem()))
        i=i->parentItem();
    return ri;
}*/
QString CResultItem::extractCmbPart(QString const & cmb, int * start, int * length) const
{
    *start=*length=0;
    int dot2=cmb.indexOf("..");
    if(dot2!=-1)
    {
        *start=dot2;
        int dot1=cmb.indexOf(".",*start+2);
        if(dot1!=-1)
            *length=dot1-*start;
        else
            *length=-1;
        return cmb.mid(*start+2,*length-2);
    }
    else
    {
        int dot1=cmb.indexOf(".");
        if(dot1!=-1)
        {
            *start=dot1-1;
            *length=2;
            return cmb.mid(*start,*length-1);
        }
        else
            return QString();
    }
}

QList<CWPair> const & CResultItem::resolveItem()
{
    if(cwitem.isResolved())
        return cwitem.wlist_resolved;
    else
    {
        QRegExp r2("\\*\\^.*\\^\\*");
        r2.setMinimal(true);

        for(int x=0;x<cwitem.wrds.count();x++)
        {
            QStringList sl(cwitem.wrds[x].second.split(",",QString::SkipEmptyParts	));
            //QString s;
            for(int y=0;y<sl.size();y++)
                cwitem.wlist.append(CWPair(cwitem.wrds[x].first,QString(sl[y]).remove(r2)));
        }

        CWItem::Header section(CWItem::No);
        CResultItem * par=parentItem(&section);

        if(par)
        {
            if(!par->cwitem.isResolved())
                par->resolveItem();
        }
        else
        {
            for(int z=0;z<cwitem.wlist.count();z++)
            {
                cwitem.wlist_resolved.append(cwitem.wlist[z]);
            }
            cwitem.stripFinalList();
            cwitem.resolved=true;
            return cwitem.wlist_resolved;
        }

        for(int z=0;z<cwitem.wlist.count();z++)
        {
            bool combined=false;
            int const dmb(cwitem.wlist[z].first);
            cwitem.stripFirstWord(cwitem.wlist[z].second);
            QString const cmb(cwitem.wlist[z].second);

            int start,length;
            QString const cmbs(extractCmbPart(cmb,&start,&length));
            if(!cmbs.isEmpty())
            {

                for(int r=0;r<par->cwitem.wlist_resolved.count();r++)
                {
                    int const cwd(par->cwitem.wlist_resolved[r].first);
                    QString cwi(par->cwitem.wlist_resolved[r].second);

                    /*if(cwi.indexOf(QRegExp("[+]"))!=-1)
                        continue;*/


                    if(cwi.startsWith(cmbs))
                    {
                        int d=dmb;
                        if(d==0)
                            d=cwd;
                        switch(section)
                        {
                        case CWItem::No :
                        case CWItem::Other :
                            cwitem.wlist_resolved.append(CWPair(d,QString(cmb).replace(start,length,cwi)));
                            break;
                        case CWItem::Tr :
                            //if(cwi.indexOf(QRegExp("[-=]"))!=-1)
                                cwitem.wlist_resolved.append(CWPair(d,QString(cmb).replace(start,length,cwi)));
                            break;
                        case CWItem::Intr :
                            //if(cwi.indexOf(QRegExp("[-=]"))==-1)
                                cwitem.wlist_resolved.append(CWPair(d,QString(cmb).replace(start,length,cwi)));
                            break;
                        }


                        combined=true;
                    }
                }
                cwitem.stripFinalList();
            }
            else
            {
                int star=cmb.indexOf("^^"),
                    star2=cmb.indexOf("^^^");
                if(star!=-1)
                {
                    int rl=2;
                    if(star2!=-1)
                    {
                        star=star2;
                        rl=3;
                    }
                    //CResultItem * topi=topItem();
                    for(int r=0;r<par->cwitem.wlist_resolved.count();r++)
                    {
                        int const cwd(par->cwitem.wlist_resolved[r].first);
                        QString cwi(par->cwitem.wlist_resolved[r].second);
                        int d=dmb;
                        if(d==0)
                            d=cwd;


                        switch(section)
                        {
                        case CWItem::No :
                        case CWItem::Other :
                            cwitem.wlist_resolved.append(CWPair(d,QString(cmb).replace(star,rl,cwi)));
                            break;
                        case CWItem::Tr :
                            //if(cwi.indexOf(QRegExp("[-=]"))!=-1)
                                cwitem.wlist_resolved.append(CWPair(d,QString(cmb).replace(star,rl,cwi)));
                            break;
                        case CWItem::Intr :
                            //if(cwi.indexOf(QRegExp("[-=]"))==-1)
                                cwitem.wlist_resolved.append(CWPair(d,QString(cmb).replace(star,rl,cwi)));
                            break;
                        }


                        combined=true;
                    }

                    cwitem.stripFinalList();
                }
                else
                {
                    cwitem.wlist_resolved.append(CWPair(dmb,cmb));
                    cwitem.stripFinalList();
                    combined=true;
                }
            }
            if(!combined)
                cwitem.warnings=1;
        }
        cwitem.resolved=true;
    }
    return cwitem.wlist_resolved;
}

// MToolTipLabel

MToolTipWidget::MToolTipWidget(QWidget * parent) :
    QWidget(parent),
    _text()
{
}

void MToolTipWidget::paintEvent(QPaintEvent * event)
{
    QStaticText st(_text);
    st.setTextFormat(Qt::RichText);
    QTextOption option(Qt::AlignLeft|Qt::AlignTop);
    option.setWrapMode(QTextOption::NoWrap);
    st.setTextOption(option);
    st.setTextWidth(-1);
    st.prepare(QTransform(),font());
    QSize stsize(st.size().toSize());
    stsize.setHeight(stsize.height()+20);
    stsize.setWidth(stsize.width()+20);

    QRect const desktop_size(QApplication::desktop()->screenGeometry());

    if(geometry().left()+stsize.width()>desktop_size.right())
    {
        option.setWrapMode(QTextOption::WordWrap);
        st.setTextWidth(desktop_size.width()-geometry().left()-20);
        st.setTextOption(option);
        st.prepare(QTransform(),font());
        stsize=st.size().toSize();
        stsize.setHeight(stsize.height()+20);
        stsize.setWidth(stsize.width()+20);
    }

    resize(stsize);

    if(geometry().bottom()>desktop_size.bottom())
        move(QPoint(geometry().left(),desktop_size.height()-geometry().height()));

    QPainter painter(this);
    //painter.setBackgroundMode(Qt::OpaqueMode);
    QBrush brush(Qt::SolidPattern);
    brush.setColor(QColor(250,250,240));
    QRect absr(QPoint(0,0),stsize);
    painter.fillRect(absr,brush);
    QPen pen(QColor(200,200,200));
    pen.setWidth(2);
    pen.setStyle(Qt::SolidLine);
    absr.setTop(absr.top()+1);
    absr.setLeft(absr.left()+1);
    absr.setWidth(absr.width()-1);
    absr.setHeight(absr.height()-1);
    painter.save();
    painter.setPen(pen);
    painter.drawRect(absr);
    painter.restore();
    painter.drawStaticText(QPoint(10,10),st);
    event->accept();
}

void MToolTipWidget::setText(QString const & text)
{
    _text=text;
}
