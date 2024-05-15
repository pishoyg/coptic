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

#include "mcopticnumerals.h"
#include "ui_mcopticnumerals.h"

QStringList MCopticNumerals::pw1m=QStringList()<< "oua"
                                               << "snau"
                                               << "Somnt"
                                               << "Ftoou"
                                               << "Tou"
                                               << "soou"
                                               << "saSF"
                                               << "Smoun"
                                               << "cis";
QStringList MCopticNumerals::pw1f=QStringList()<< "ouei"
                                               << "snte"
                                               << "Somte"
                                               << "Fto"
                                               << "T"
                                               << "so"
                                               << "saSFe"
                                               << "Smoune"
                                               << "cite";
QStringList MCopticNumerals::pw1m_t=QStringList()<< "oue"
                                                 << "snoous"
                                                 << "Somte"
                                                 << "aFte"
                                                 << "th"
                                                 << "ase"
                                                 << "saSFe"
                                                 << "Smhn"
                                                 << "cis";
QStringList MCopticNumerals::pw1f_t=QStringList()<< "ouei"
                                                 << "snoouse"
                                                 << "Somte"
                                                 << "aFte"
                                                 << "th"
                                                 << "ase"
                                                 << "saSFe"
                                                 << "Smhne"
                                                 << "cite";
QStringList MCopticNumerals::pw2m=QStringList()<< "mht"
                                               << "Jouwt"
                                               << "maab"
                                               << "Hme"
                                               << "taeiou"
                                               << "se"
                                               << "SFe"
                                               << "Hmene"
                                               << "pstaiou";
QStringList MCopticNumerals::pw2f=QStringList()<< "mhte"
                                               << "Jouwte"
                                               << "maabe"
                                               << "Hme"
                                               << "taeiou"
                                               << "se"
                                               << "SFe"
                                               << "Hmene"
                                               << "pstaiou";
QStringList MCopticNumerals::pw2mf_p=QStringList()<< "mnt"
                                                 << "Jout"
                                                 << "mab"
                                                 << "Hme"
                                                 << "taeiou"
                                                 << "se"
                                                 << "SFe"
                                                 << "Hmene"
                                                 << "pstaiou";

MCopticNumerals::MCopticNumerals(QWidget *parent,bool as_embedded) :
    QWidget(parent),
    ui(new Ui::MCopticNumerals)
{
    ui->setupUi(this);

    if(as_embedded)
        ui->btClose->hide();

    ui->txtOutput->setPlainText(tr("ranges of numbers:\ncoptic: 1-999 999 999 (by words: 1-99 999)\ngreek: 1-99 999 999\nroman: 1-4 999\nhebrew: 1-999 999 999 (geresh stands for thousands separator)\n\n"));

    ui->wdgInput->hideRegExpButton();
    ui->wdgInput->setSwitchState(true);
    ui->wdgInput->setVAsPreferred();
    ui->wdgInput->setNumeric(true);
    ui->wdgInput->setScript(CTranslit::Copt);

    ui->wdgInputGk->hideRegExpButton();
    ui->wdgInputGk->setSwitchState(true);
    ui->wdgInputGk->setVAsPreferred();
    ui->wdgInputGk->setNumeric(true);
    ui->wdgInputGk->setScript(CTranslit::Greek);

    ui->wdgInputHb->hideRegExpButton();
    ui->wdgInputHb->setSwitchState(true);
    ui->wdgInputHb->setVAsPreferred();
    ui->wdgInputHb->setNumeric(true);
    ui->wdgInputHb->setScript(CTranslit::Hebrew);

    ui->cmbInputRoman->setFont(m_sett()->bFont(CTranslit::Latin));

    IC_SIZES
}

MCopticNumerals::~MCopticNumerals()
{
    delete ui;
}

void MCopticNumerals::on_btConvert_clicked()
{
    static unsigned int anchor_num(0);
    anchor_num++;

    QString const anchor(QString("#")+QString::number(anchor_num));
    ui->txtOutput->appendHtml("<a name=\""+anchor+"\"></a>");

    switch(ui->tabInput->currentIndex())
    {
    case 0 :
        ui->wdgInput->updateL(true,CTranslit::RemoveAll);
        ui->txtOutput->appendHtml(coptNumToArabNum(ui->wdgInput->text()));
        ui->wdgInput->updateHistory();
        break;
    case 1 :
        ui->wdgInputGk->updateL(true,CTranslit::RemoveAll);
        ui->txtOutput->appendHtml(greekNumToArabNum(ui->wdgInputGk->text()));
        ui->wdgInputGk->updateHistory();
        break;
    case 2 :
        ui->wdgInputHb->updateL(true,CTranslit::RemoveAll);
        ui->txtOutput->appendHtml(hebrewNumToArabNum(ui->wdgInputHb->text()));
        ui->wdgInputHb->updateHistory();
        break;
    case 3 :
    {
        QString const ct(ui->cmbInputRoman->currentText());
        ui->txtOutput->appendHtml(romanNumToArabNum(ct));
        ui->cmbInputRoman->insertItem(0,ct);
        break;
    }
    case 4 :
    {
        if(!(ui->cbToCoptic->isChecked()||
                ui->cbToGreek->isChecked()||
                ui->cbToHebrew->isChecked()||
                ui->cbToRoman->isChecked()))
        {
            ui->txtOutput->appendHtml(tr("no numeral system checked!"));
            m_msg()->MsgWarn(tr("no numeral system checked!"));
        }
        else
        {
            QString out("<table><tbody><tr><td>");
            if(ui->cbToCoptic->isChecked())
                out.append(arabNumToCoptNum(QString::number(ui->spnInput->value())));
            if(ui->cbToGreek->isChecked())
                out.append(arabNumToGreekNum(QString::number(ui->spnInput->value())));
            if(ui->cbToHebrew->isChecked())
                out.append(arabNumToHebrewNum(QString::number(ui->spnInput->value())));
            if(ui->cbToRoman->isChecked())
                out.append(arabNumToRomanNum(ui->spnInput->value()));

            out.append("</td></tr></tbody></table>");
            ui->txtOutput->appendHtml(out);
        }
        break;
    }
    }
    ui->txtOutput->scrollToAnchor(anchor);
}

QString MCopticNumerals::coptNumToArabNum(QString const & coptNum)
{
    unsigned int fn[]={0,0,0,0,0,0,0,0,0};
    QString num(coptNum);
    int p,cpow(0);
    QString r(tr("coptic number ")+coptNum+" | "+m_sett()->spanStringFont(CTranslit::tr(coptNum,CTranslit::CopticTrToCopticN_num),CTranslit::Copt)+tr(" to hindu-arabic: ")),
            rvnum;
    while((p=num.length()-1)>=0)
    {
        QString s;
        if(num[p]=='-'||num[p]=='*'||num[p]=='+')
        {
            if(p>0)
            {
                s.append(num[p-1]);
                s.append(num[p]);
                num.chop(2);
            }
            else
                return r+tr("invalid number!");
        }
        else
        {
            s.append(num[p]);
            num.chop(1);
        }

        while((cpow++,!isPower(cpow,s,fn[cpow-1])))
            if(cpow>9)
                return r+tr("invalid number!");
    }

    unsigned int ir(0);
    for(int x=8;x>=0;x--)
        if(fn[x]>0)
        {
            rvnum.append(QString::number(fn[x])+"+");
            ir+=fn[x];
        }
    if(ir>0)
    {
        rvnum.chop(1);
        rvnum.append("=<big><u>");
        rvnum.append(QString::number(ir));
    }
    else rvnum.append("???");
    return QString(r+rvnum+"</u></big><br>");
}

bool MCopticNumerals::isPower(unsigned int power,QString const & s,unsigned int & output)
{
    static QString const
            pow1("abgdeVzhq"),
            pow2("iklmnjopF"),
            pow3("rstufxcwR");

    QString const * const pow[]={&pow1,&pow2,&pow3,
                                &pow1,&pow2,&pow3,
                                &pow1,&pow2,&pow3};
    int c(s.length());
    QString n; short pw(1);
    switch(c)
    {
    case 1 :
        n=s[0];
        pw=1;
        break;
    case 2 :
    {
        n=s[0];
        if(s[1]=='*')
            pw=2;
        else if(s[1]=='-')
            pw=1;
        else if(s[1]=='+')
            pw=3;
        else
            return false;
        break;
    }
    default :
        return false;
        break;
    }

    if(power<1||power>9)
        return false;
    if(power>=1&&power<=3&&pw!=1)
        return false;
    if(power>=4&&power<=6&&pw!=2)
        return false;
    if(power>=7&&power<=9&&pw!=3)
        return false;

    int p(pow[power-1]->indexOf(n));
    if(p!=-1)
    {
        output=(p+1)*pow10(power);
        return true;
    }
    else
        return false;

    return false;
}

unsigned int MCopticNumerals::pow10(unsigned int p)
{
    unsigned int d(1);
    for(unsigned int x=1;x<p;x++)
        d*=10;
    return d;
}

void MCopticNumerals::on_btClose_clicked()
{
    close();
}

QString MCopticNumerals::arabNumToCoptNum(QString const & arabNum)
{
    static QString const
            pow1("abgdeVzhq"),
            pow2("iklmnjopF"),
            pow3("rstufxcwR");

    QString const * const pow[]={&pow1,&pow2,&pow3,
                                &pow1,&pow2,&pow3,
                                &pow1,&pow2,&pow3};

    QString anum(arabNum);
    anum.remove(QRegExp("[^0-9]"));

    QString rv(tr("hindu-arabic number ")+"<big>"+anum+"</big>"+tr(" to coptic: ")),rvnum; int pw(0);
    for(int x=anum.length();x>0;x--)
    {
        QString const s(anum[x-1]);
        if(QRegExp("[0-9]").indexIn(s)==-1)
            continue;
        if(pw++>9)
            return rv+tr("invalid number!");

        unsigned short const i=s.toUShort();
        if(i>0)
        {
            switch(pw)
            {
            case 1 :
            case 2 :
            case 3 :
                rvnum.prepend('-');
                break;
            case 4 :
            case 5 :
            case 6 :
                rvnum.prepend('*');
                break;
            case 7 :
            case 8 :
            case 9 :
                rvnum.prepend('+');
                break;
            }
            rvnum.prepend(pow[pw-1]->at(i-1));
        }
    }

    unsigned int i_anum(anum.toUInt());
    QString fullwords_m,fullwords_f;
    QString const m_art("(p,pe) "),f_art("(t,te) ");
    if(i_anum<=99999)
    {
        fullwords_m=m_sett()->spanStringFont(CTranslit::tr(m_art+arabNumToCopticNumLit(i_anum,true),CTranslit::CopticTrToCopticN),CTranslit::Copt);
        fullwords_f=m_sett()->spanStringFont(CTranslit::tr(f_art+arabNumToCopticNumLit(i_anum,false),CTranslit::CopticTrToCopticN),CTranslit::Copt);
    }
    else
        fullwords_f=fullwords_m=tr("(only for numbers 1-99 999)");

    return QString(rv+rvnum+" | "+m_sett()->spanStringFont(CTranslit::tr(rvnum,CTranslit::CopticTrToCopticN_num),CTranslit::Copt)+tr(" | full words, masc: ")+fullwords_m+tr(" fem: ")+fullwords_f+"<br>");
}

QString MCopticNumerals::greekNumToArabNum(QString const & greekNum)
{
    static QString s1(QString::fromUtf8("Μ")),s2("M");
    int p=greekNum.indexOf(s1);
    QString r(tr("greek number ")+greekNum+" | "+m_sett()->spanStringFont(CTranslit::tr(greekNum,CTranslit::GreekTrToGreekN_num),CTranslit::Greek)+tr(" to hindu-arabic: "));
    if(p==-1)
    {
        p=greekNum.indexOf(s2);
        if(p==-1)
        {
            unsigned int num(greekShNumToArabNum(greekNum));
            if(num==0)
                return r+tr("invalid number! (=0)");
            else
                return r+"<big><u>"+QString::number(num)+"</u></big><br>";
        }
    }

    if(p==0)
        return r+tr("invalid number! (standalone 'M' symbol)");

    QString num1(greekNum.left(p)),
            num2(greekNum.mid(p+1));

    unsigned int inum1(greekShNumToArabNum(num1)),
                 inum2(greekShNumToArabNum(num2));

    if(inum1==0)
        return r+tr("invalid number! (standalone 'M' symbol)");

    return r+"<big><u>"+QString::number((inum1*10000)+inum2)+"</u></big><br>";
}

unsigned int MCopticNumerals::greekShNumToArabNum(QString const & greekNum)
{
    if(greekNum.count()<1)
        return 0;
    QString gkNum(greekNum);
    static QString const
            pow1("abgdeSzhq"),
            pow2("iklmnjopK"),
            pow3("rstufxcwR"),
            pow4("abgdeSzhq");

    QString const * const pow[]={&pow1,
                                 &pow2,
                                 &pow3,
                                 &pow4};

    int pw;
    if(gkNum.startsWith("-"))
    {
        pw=5;
        gkNum.remove(0,1);
    }
    else
        pw=4;

    unsigned int nums[]={0,0,0,0};
    for(int x=0;x<gkNum.count();x++)
    {
        QChar ch(gkNum.at(x));
        newpw:
        if(--pw==0)
            return 0;
        int p=pow[pw-1]->indexOf(ch);
        if(p!=-1)
            nums[pw-1]=(p+1)*pow10(pw);
        else goto newpw;
    }

    return nums[0]+nums[1]+nums[2]+nums[3];
}

QString MCopticNumerals::arabNumToGreekNum(QString const & arabNum)
{
    QString anum(arabNum);
    anum.remove(QRegExp("[^0-9]"));
    QString r(tr("hindu-arabic number ")+"<big>"+anum+"</big>"+tr(" to greek: "));
    unsigned int inum(anum.toUInt());
    if(inum>99999999)
        return r+tr("invalid number! (>99 999 999)");
    if(inum>9999)
    {
        QString n1,n2;
        unsigned int inum2(inum%10000);
        n2=arabShNumToGreekNum(inum2);
        inum-=inum2;
        inum/=10000;
        n1=arabShNumToGreekNum(inum);

        QString rvnum(n1+"M"+n2);
        return r+rvnum+" | "+m_sett()->spanStringFont(CTranslit::tr(rvnum,CTranslit::GreekTrToGreekN_num),CTranslit::Greek)+"<br>";
    }
    else
    {
        QString rvnum(arabShNumToGreekNum(anum.toUInt()));
        return r+rvnum+" | "+m_sett()->spanStringFont(CTranslit::tr(rvnum,CTranslit::GreekTrToGreekN_num),CTranslit::Greek)+"<br>";
    }
}

QString MCopticNumerals::arabShNumToGreekNum(unsigned int arabNum)
{
    if(arabNum>9999)
        return tr("-invalid part of number! (>9 999)-");
    if(arabNum==0)
        return QString();

    static QString const
            pow1("abgdeSzhq"),
            pow2("iklmnjopK"),
            pow3("rstufxcwR"),
            pow4("abgdeSzhq");

    QString const * const pow[]={&pow1,
                                 &pow2,
                                 &pow3,
                                 &pow4};

    QString r;
    unsigned int n(arabNum),pw(5);
    while(n>0)
    {
        if(--pw==0)
            return tr("-invalid part of number!-");

        unsigned int p(n/pow10(pw));
        if(p>0)
        {
            if(p>9)
                return tr("-invalid part of number!-");
            r.append(pow[pw-1]->at(p-1));
            if(pw==4)
                r.prepend("-");
            n-=pow10(pw)*p;
        }
    }
    return r;
}

QString MCopticNumerals::arabNumToHebrewNum(QString const & arabNum)
{
    QString anum(arabNum);
    anum.remove(QRegExp("[^0-9]"));
    unsigned int inum(anum.toUInt());

    QString r(tr("hindu-arabic number ")+"<big>"+anum+"</big>"+tr(" to hebrew: "));
    if(inum>999999999)
        return r+tr("invalid number! (>999 999 999)");
    if(inum<1)
        return r+tr("invalid number! (<1)");

    QString rvnum_os,rvnum_ns;
    unsigned int n[]={0,0,0};
    n[0]=inum/1000000;
    inum-=n[0]*1000000;
    n[1]=inum/1000;
    inum-=n[1]*1000;
    n[2]=inum;

    for(int x=0;x<3;x++)
    {
        rvnum_os.append(arabShNumToHebrewNum(n[x],false)+"'");
        rvnum_ns.append(arabShNumToHebrewNum(n[x],true)+"'");
    }

    rvnum_os.chop(1); rvnum_ns.chop(1);
    rvnum_os.remove(QRegExp("^'+"));
    rvnum_ns.remove(QRegExp("^'+"));

    return r+rvnum_os+" | "+rvnum_ns+tr(" | old style: ")+m_sett()->spanStringFont(CTranslit::tr(rvnum_os,CTranslit::HebrewTrToHebrewN_num),CTranslit::Hebrew)+tr(" | new style: ")+m_sett()->spanStringFont(CTranslit::tr(rvnum_ns,CTranslit::HebrewTrToHebrewN_num),CTranslit::Hebrew)+"<br>";
}

QString MCopticNumerals::arabShNumToHebrewNum(unsigned int arabNum,bool modern)
{
    if(arabNum>999)
        return tr("-invalid part of number! (>999)-");
    /*if(arabNum==0)
        return tr("-invalid part of number! (<1)-");*/

    static QString const
            pow1("abgdevzht"),
            pow2("iklmnsypc"),
            pow3("qrjuKMNPC");

    QString const * const pow[]={&pow1,
                                 &pow2,
                                 &pow3};

    QString r;
    unsigned int n(arabNum),pw(4);
    while(n>0)
    {
        if(--pw==0)
            return tr("-invalid part of number!-");

        unsigned int p(n/pow10(pw));
        if(p>0)
        {
            if(p>9)
                return tr("-invalid part of number!-");
            r.append(pow[pw-1]->at(p-1));
            if(pw==4)
                r.prepend("-");
            n-=pow10(pw)*p;
        }
    }

    if(!modern)
    {
        if(r.startsWith("K"))
            r.replace(0,1,"uq");
        else if(r.startsWith("M"))
            r.replace(0,1,"ur");
        else if(r.startsWith("N"))
            r.replace(0,1,"uj");
        else if(r.startsWith("P"))
            r.replace(0,1,"uu");
        else if(r.startsWith("C"))
            r.replace(0,1,"uuq");

        if(r.endsWith("ie"))
            r.replace(QRegExp("ie$"),"tv");
        else if(r.endsWith("iv"))
            r.replace(QRegExp("iv$"),"tz");
    }

    return r;
}

QString MCopticNumerals::arabNumToRomanNum(unsigned int arabNum, QString * full_roman, QString * st_roman)
{
    QString r(tr("hindu-arabic number ")+"<big>"+QString::number(arabNum)+"</big>"+tr(" to roman: "));
    if(arabNum>4999||arabNum==0)
    {
        r.append(tr("invalid number! (>4999|=0)"));
        return r;
    }

    unsigned int an(arabNum);
    QString rnum;
    if(an>=1000)
    {
        unsigned int th=an/(unsigned int)1000;
        rnum.append(QString("M").repeated(th));
        an-=th*1000;
    }
    if(an>=100)
    {
        unsigned int th=an/(unsigned int)100;
        rnum.append(QString("C").repeated(th));
        an-=th*100;
    }
    if(an>=10)
    {
        unsigned int th=an/(unsigned int)10;
        rnum.append(QString("X").repeated(th));
        an-=th*10;
    }
    if(an>=1)
    {
        rnum.append(QString("I").repeated(an));
    }

    rnum.replace(QString("C").repeated(5),QString("D"));
    rnum.replace(QString("X").repeated(5),QString("L"));
    rnum.replace(QString("I").repeated(5),QString("V"));

    QString const frnum(rnum);
    if(full_roman)
        (*full_roman)=rnum;

    rnum.replace(QString("DCCCC"),QString("CM"));
    rnum.replace(QString("CCCC"),QString("CD"));
    rnum.replace(QString("LXXXX"),QString("XC"));
    rnum.replace(QString("XXXX"),QString("XL"));
    rnum.replace(QString("VIIII"),QString("IX"));
    rnum.replace(QString("IIII"),QString("IV"));

    if(st_roman)
        (*st_roman)=rnum;

    r.append(m_sett()->spanStringFont(frnum,CTranslit::Latin));
    if(QString::compare(frnum,rnum,Qt::CaseSensitive)!=0)
        r.append(tr(" | subtractive notation: ")+m_sett()->spanStringFont(rnum,CTranslit::Latin));

    return r;
}

QString MCopticNumerals::romanNumToArabNum(QString const & romanNum)
{
    QString rnum(romanNum.toUpper().remove(QRegExp("[^IVXLCDM]")));
    QString const orignum(rnum);
    QString rtm(tr("roman number ")+m_sett()->spanStringFont(orignum,CTranslit::Latin)+tr(" to hindu-arabic: "));

    rnum.replace(QString("CM"),QString("DCCCC"));
    rnum.replace(QString("CD"),QString("CCCC"));
    rnum.replace(QString("XC"),QString("LXXXX"));
    rnum.replace(QString("XL"),QString("XXXX"));
    rnum.replace(QString("IX"),QString("VIIII"));
    rnum.replace(QString("IV"),QString("IIII"));

    QString const roman("IVXLCDM");

    unsigned int rv(0);
    unsigned int const val[]={1,5,10,50,100,500,1000};
    for(int x=0;x<rnum.count();x++)
    {
        QChar ch(rnum.at(x));
        int ov=roman.indexOf(ch);
        if(ov>=0&&ov<=6)
            rv+=val[ov];
    }

    if(rv>4999||rv==0)
        return rtm+tr("invalid number! (>4 999|=0)");

    rtm.append("<big><u>"+QString::number(rv)+"</u></big>");

    QString f_rom,s_rom;
    QString validoutput=arabNumToRomanNum(rv,&f_rom,&s_rom);

    if(QString::compare(orignum,f_rom)!=0&&QString::compare(orignum,s_rom)!=0)
        rtm.append(tr(" - improper input number format, validating ...")+"<br>"+validoutput);
    return rtm;
}

QString MCopticNumerals::hebrewNumToArabNum(QString const & hebrewNum)
{
    QString h_num(hebrewNum.trimmed());
    QString r(tr("hebrew number ")+h_num+" | "+m_sett()->spanStringFont(CTranslit::tr(h_num,CTranslit::HebrewTrToHebrewN_num),CTranslit::Hebrew)+tr(" to hindu-arabic: "));

    QStringList hl(h_num.split("'",QString::KeepEmptyParts));
    if(hl.count()>3||hl.count()<1)
        return r+tr("invalid number! (>999 999 999)");
    unsigned int rvnum(0),p(1);
    for(int x=hl.count()-1;x>=0;x--)
    {
        int n(hebrewShNumToArabNum(hl.at(x)));
        if(n==-1)
            return r+tr("invalid number!");
        rvnum+=(unsigned int)n*p;
        p*=1000;
    }

    return r+"<big><u>"+QString::number(rvnum)+"</u></big><br>";
}

int MCopticNumerals::hebrewShNumToArabNum(QString const & hebrewNum)
{
    QString h_num(hebrewNum.trimmed());
    static QString const
            pow1("abgdevzht"),
            pow2("iklmnsypc"),
            pow3("qrjuKMNPC");

    QString const * const pow[]={&pow1,
                                 &pow2,
                                 &pow3};

    unsigned int inum(0),pw(3);
    if(h_num.startsWith("uq"))
        h_num.replace(0,2,"K");
    else if(h_num.startsWith("ur"))
        h_num.replace(0,2,"M");
    else if(h_num.startsWith("uj"))
        h_num.replace(0,2,"N");
    else if(h_num.startsWith("uu"))
        h_num.replace(0,2,"P");
    else if(h_num.startsWith("uuq"))
        h_num.replace(0,3,"C");

    if(h_num.endsWith("tv"))
        h_num.replace(QRegExp("tv$"),"ie");
    else if(h_num.endsWith("tz"))
        h_num.replace(QRegExp("tz$"),"iv");

    for(int x=0;x<h_num.count();x++)
    {
        QChar ch(h_num.at(x));
        if(pw<1)
            return -1;
        bool used(false);
        for(;pw>0;pw--)
        {
            int p=pow[pw-1]->indexOf(ch);
            if(p!=-1)
            {
                inum+=(p+1)*pow10(pw);
                used=true;
                break;
            }
        }
        if(!used)
            return -1;
    }

    return inum;
}

void MCopticNumerals::on_wdgInput_query()
{
    on_btConvert_clicked();
}

void MCopticNumerals::on_wdgInputGk_query()
{
    on_btConvert_clicked();
}

void MCopticNumerals::on_wdgInputHb_query()
{
    on_btConvert_clicked();
}

void MCopticNumerals::on_btClear_clicked()
{
    ui->txtOutput->clear();
}

QString MCopticNumerals::arabNumToCopticNumLit(unsigned int arabNum,bool male)
{
    unsigned int
            n(arabNum),
            pw[]={0,0,0,0,0};

    for(int x=5;x>=1;x--)
    {
        pw[x-1]=n/pow10(x);
        n-=pow10(x)*pw[x-1];
    }

    QString strnum;
    if(pw[0]>0&&pw[1]>0)
    {
        if((pw[1]==1||pw[1]==2)&&pw[0]==5)
            strnum.prepend("h");
        else
            strnum.prepend((male?pw1m_t:pw1f_t).at(pw[0]-1));

        if((pw[1]==4||pw[1]==6||pw[1]==8)&&(pw[0]==4||pw[0]==6))
            strnum.prepend("t");
        strnum.prepend(pw2mf_p.at(pw[1]-1));
    }
    else if(pw[0]>0)
        strnum.prepend((male?pw1m:pw1f).at(pw[0]-1));
    else if(pw[1]>0)
        strnum.prepend((male?pw2m:pw2f).at(pw[1]-1));

    if(pw[2]>0)
    {
        switch(pw[2])
        {
        case 1 :
            strnum.prepend("Se ");
            break;
        case 2 :
            strnum.prepend("Sht ");
            break;
        default :
            strnum.prepend((male?pw1m:pw1f).at(pw[2]-1)+" nSe ");
            break;
        }
    }

    if(pw[3]>0)
    {
        switch(pw[3])
        {
        case 1 :
            strnum.prepend("So ");
            break;
        case 2 :
            strnum.prepend("So snau ");
            break;
        default :
            strnum.prepend((male?pw1m:pw1f).at(pw[3]-1)+" nSo ");
            break;
        }
    }

    if(pw[4]>0)
    {
        switch(pw[4])
        {
        case 1 :
            strnum.prepend("tba ");
            break;
        case 2 :
            strnum.prepend("tba snau ");
            break;
        default :
            strnum.prepend((male?pw1m:pw1f).at(pw[4]-1)+" ntba ");
            break;
        }
    }

    return strnum;
}

void MCopticNumerals::on_spnInput_editingFinished()
{
    on_btConvert_clicked();
}

void MCopticNumerals::convertNumber(QString const & number)
{
    if(!number.isEmpty())
    {
        QRegExp r("^[0-9]+$");
        if(r.indexIn(number)!=-1)
        {
            ui->tabInput->setCurrentIndex(4);
            ui->spnInput->setValue(number.toInt());
            ui->cbToCoptic->setChecked(true);
            ui->cbToGreek->setChecked(true);
            ui->cbToRoman->setChecked(true);
            ui->cbToHebrew->setChecked(true);
        }
        else
        {
            CTranslit::Script const sc=CTranslit::identify(number);
            switch(sc)
            {
            case CTranslit::Copt :
                ui->tabInput->setCurrentIndex(0);
                ui->wdgInput->setText(number);
                break;
            case CTranslit::Greek :
                ui->tabInput->setCurrentIndex(1);
                ui->wdgInputGk->setText(number);
                break;
            case CTranslit::Latin :
                ui->tabInput->setCurrentIndex(3);
                ui->cmbInputRoman->setEditText(number);
                break;
            case CTranslit::Hebrew :
                ui->tabInput->setCurrentIndex(2);
                ui->wdgInputHb->setText(number);
                break;
            }

        }
        on_btConvert_clicked();
    }
}
