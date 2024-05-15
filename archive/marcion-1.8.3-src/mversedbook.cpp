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

#include "mversedbook.h"
#include "ui_mversedbook.h"

MVersedBook::MVersedBook(QString const & name,
                         Script script,
                         TextFormat textFormat,
                         int key,
                         QString const & show_text,
                         QWidget *parent) :
    QMainWindow(parent),
    MDocumentBase(MDocumentBase::MySql),
    ui(new Ui::MVersedBook),
    _sbw(),
    agr(this),
    key(key),mode(Chapter),script(script),textFormat(textFormat),store(),popupSimul(),popupSimulC(),popupSimulL(),_font_offset(0),_is_wlc(false),_ch_min_verse(),_ch_max_verse(),
    _chapter_old_value(-1),_verse_old_value(-1)
{
    ui->setupUi(this);

    ui->statusBar->addPermanentWidget(&_sbw);
    _sbw.setStatusMode(false);

    agr.setExclusive(true);
    agr.addAction(ui->actionChapter_by_chapter);
    agr.addAction(ui->actionEntire_book);

    bool const entire_book=m_sett()->showEntireBook();
    ui->actionChapter_by_chapter->setChecked(!entire_book);
    ui->actionEntire_book->setChecked(entire_book);
    mode=entire_book?Chapter:Book;
    ui->actionHyperlinks_to_concordance->setChecked(m_sett()->showHyperlinksToConcordance());

    al_remove=popupSimulL.addAction(QIcon(":/new/icons/icons/delete.png"),tr("&remove"));
    popupSimulL.addSeparator();
    al_rmall=popupSimulL.addAction(tr("r&emove all"));

    ac_move=popupSimulC.addAction(QIcon(":/new/icons/icons/go.png"),tr("&add to list"));
    popupSimulC.addSeparator();
    ac_refresh=popupSimulC.addAction(QIcon(":/new/icons/icons/refresh.png"),tr("&refresh from library"));

    a_prev=popupSimul.addAction(QIcon(":/new/icons/icons/uparrow.png"),tr("&previous verse"));
    a_prev->setShortcut(QKeySequence("Ctrl+PgUp"));
    a_next=popupSimul.addAction(QIcon(":/new/icons/icons/downarrow.png"),tr("n&ext verse"));
    a_next->setShortcut(QKeySequence("Ctrl+PgDown"));
    popupSimul.addSeparator();
    a_lead=popupSimul.addAction(tr("&leading book"));
    a_lead->setCheckable(true);
    a_lead->setChecked(true);
    a_wrap=popupSimul.addAction(tr("&word wrap"));
    a_wrap->setCheckable(true);
    a_wrap->setChecked(true);
    popupSimul.addSeparator();
    a_dict=popupSimul.addAction(tr("&dictionary (autodetect)"));
    a_dict->setShortcut(QKeySequence("Ctrl+Meta+A"));
    a_crum=popupSimul.addAction(QIcon(":/new/icons/icons/gima.png"),tr("search in &Coptic dictionary"));
    a_crum->setShortcut(QKeySequence("Ctrl+Meta+C"));
    a_lsj=popupSimul.addAction(QIcon(":/new/icons/icons/alfa2.png"),tr("search in &Gk/Lat dictionary"));
    a_lsj->setShortcut(QKeySequence("Ctrl+Meta+L"));
    a_heb=popupSimul.addAction(QIcon(":/new/icons/icons/abgd.png"),tr("search in &Hebrew dictionary"));
    a_heb->setShortcut(QKeySequence("Ctrl+Meta+H"));
    a_searchlib=popupSimul.addAction(QIcon(":/new/icons/icons/loupe.png"),tr("&search in library"));
    a_searchlib->setShortcut(QKeySequence("Ctrl+Meta+S"));
    a_num=popupSimul.addAction(QIcon(":/new/icons/icons/numcnv.png"),tr("convert n&umber"));
    a_num->setShortcut(QKeySequence("Ctrl+Meta+N"));
    popupSimul.addSeparator();
    a_copy=popupSimul.addAction(QIcon(":/new/icons/icons/copy.png"),tr("c&opy"));
    a_copy->setShortcut(QKeySequence("Ctrl+C"));
    a_copyall=popupSimul.addAction(tr("copy &all"));
    popupSimul.addSeparator();
    a_incf=popupSimul.addAction(QIcon(":/new/icons/icons/loupe_plus.png"),tr("&larger font"));
    QList<QKeySequence> kseq=QList<QKeySequence>()
            << QKeySequence(Qt::ControlModifier+Qt::Key_M)
            << QKeySequence(Qt::ControlModifier+Qt::Key_Plus);
    a_incf->setShortcuts(kseq);
    a_decf=popupSimul.addAction(QIcon(":/new/icons/icons/loupe_minus.png"),tr("s&maller font"));
    kseq=QList<QKeySequence>()
                << QKeySequence(Qt::ControlModifier+Qt::Key_N)
                << QKeySequence(Qt::ControlModifier+Qt::Key_Minus);
    a_decf->setShortcuts(kseq);
    a_normf=popupSimul.addAction(tr("&normal font"));

    _is_wlc=MHebrDict::isWLC(key);

    ui->actionConcordance->setVisible(_is_wlc);
    ui->actionHyperlinks_to_concordance->setVisible(_is_wlc);

    //if(_is_wlc)
        connect(ui->brBook->browser(),SIGNAL(anchorClicked(QUrl)),this,SLOT(slot_outputAnchorClicked(QUrl)));


    ui->wdgSimul->setVisible(false);
    ui->stwSimul->setCurrentIndex(1);
    ui->tblSimulTexts->verticalHeader()->setResizeMode(QHeaderView::Fixed);

    ui->btCopyExt->setVisible(m_sett()->isCopticEditable());
    ui->btCopyExt2->setVisible(m_sett()->isCopticEditable());

    ui->tbarTools->addAction(QIcon(":/new/icons/icons/loupe.png"),tr("find"),this,SLOT(on_actionFind_triggered()));
    ta_simul=ui->tbarTools->addAction(QIcon(":/new/icons/icons/sim.png"),tr("simultaneous reader"),this,SLOT(slot_activateSR()));
    ta_simul->setCheckable(true);
    ta_simul->setChecked(false);


        ta_entire=ui->tbarTools->addAction(QIcon(":/new/icons/icons/entire.png"),tr("entire book / by chapter"),this,SLOT(slot_bookMode()));
        ta_entire->setCheckable(true);
        ta_entire->setChecked(false);

    ui->tbarTools->addSeparator();
    ui->tbarTools->addAction(QIcon(":/new/icons/icons/alfa2.png"),tr("Gk/Lat dictionary"),this,SLOT(on_actionGr_Lat_dictionary_triggered()));
    ui->tbarTools->addAction(QIcon(":/new/icons/icons/gima.png"),tr("Coptic dictionary"),this,SLOT(on_actionCoptic_dictionary_triggered()));
    ui->tbarTools->addAction(QIcon(":/new/icons/icons/abgd.png"),tr("Hebrew dictionary"),this,SLOT(on_action_Hebrew_dictionary_triggered()));

    connect(ui->menuView,SIGNAL(aboutToShow()),this,SLOT(slot_mnuV()));

    setWindowTitle(name);

    ui->mspChapter->initSpecShorcuts();
    ui->brBook->init(name,(CBookTextBrowser::Script)script);

    setTabOrder(ui->mspChapter,ui->mspVerse);

    read_chapters(key);
    if(mode==Book)
        on_actionChapter_by_chapter_triggered();
    else
        on_actionEntire_book_triggered();

    if(!show_text.isEmpty())
    {
        ui->brBook->setPanelVisibility(true);
        ui->brBook->inputBox().setText(show_text);
        ui->brBook->inputBox().setSwitchState(true);
    }

    ICTB_SIZES
}

MVersedBook::~MVersedBook()
{
    RM_WND;
    delete ui;
}

//

void MVersedBook::slot_outputAnchorClicked(QUrl url)
{
    QString c=url.path();
    if(c.endsWith("c")){
        c.chop(1);

        QStringList chv=c.split("/");
        int bnum_base;
        if(key>M_WLC_MORPH)
            bnum_base=M_WLC_MORPH;
        else if(key>M_WLC_CONS)
            bnum_base=M_WLC_CONS;
        else if(key>M_WLC_VOW)
                bnum_base=M_WLC_VOW;
        else bnum_base=M_WLC_ACC;

        int const ch=chv.at(0).toInt();
        int const v=chv.at(1).toInt();
        ui->brBook->hebDict()->analyseVerse(key-bnum_base-1,ch,v,mode==Chapter?ui->mspVerse->maxValue():_ch_max_verse.value(ch));
        ui->brBook->header()->setDocMode(MDocHeader::HebDict);
    }else if(c.endsWith("v")){
        c.chop(1);
        QStringList chv=c.split("/");
        int const ch=chv.at(0).toInt();
        int const v=chv.at(1).toInt();
        findVerse(ch,v);
    }
}

void MVersedBook::keyPressEvent(QKeyEvent * event)
{
    event->ignore();
    if(ui->tbrSimulText->hasFocus())
    {
        if(event->modifiers()==(Qt::ControlModifier+Qt::MetaModifier))
        {
            QString const st(ui->tbrSimulText->textCursor().selectedText());
            switch(event->key())
            {
            case Qt::Key_A :
                if(!st.isEmpty())
                {
                    if(CTranslit::isCoptic(st))
                        ui->brBook->find_word(st);
                    else if(CTranslit::isHebrew(st))
                        ui->brBook->find_hebrew_word(st);
                    else
                        ui->brBook->find_greek_word(st);
                }
                event->accept();
            break;
            case Qt::Key_C :
                if(!st.isEmpty())
                        ui->brBook->find_word(st);
                event->accept();
            break;
            case Qt::Key_L :
                if(!st.isEmpty())
                    ui->brBook->find_greek_word(st);
                event->accept();
            break;
            case Qt::Key_S :
                if(!st.isEmpty())
                    ui->brBook->searchLibrary(st);
                event->accept();
            break;
            case Qt::Key_N :
                if(!st.isEmpty())
                    ui->brBook->convert_number(st);
                event->accept();
            break;
            }
        }

        if(event->modifiers()==Qt::ControlModifier)
        {
            switch(event->key())
            {
            case Qt::Key_Plus :
            case Qt::Key_M :
                _font_offset+=1;
                refresh_simul();
                event->accept();
            break;
            case Qt::Key_Minus :
            case Qt::Key_N :
                _font_offset-=1;
                refresh_simul();
                event->accept();
            break;
            case Qt::Key_C :
                ui->brBook->browser()->copy();
                event->accept();
            break;
            }
        }
    }
}

void MVersedBook::slot_mnuV()
{
    ui->actionT_oolbar->setChecked(ui->tbarTools->isVisible());
    switch(mode)
    {
    case Book :
        ui->actionEntire_book->setChecked(true);
        break;
    case Chapter :
        ui->actionChapter_by_chapter->setChecked(true);
        break;
    }
}

void MVersedBook::slot_bookMode()
{
    if(ta_entire->isChecked())
        on_actionEntire_book_triggered();
    else
        on_actionChapter_by_chapter_triggered();
}

void MVersedBook::showBook(int book,int chapter)
{
    USE_CLEAN_WAIT

    CMySql q;

    QString query(get_query(book,chapter));

    m_msg()->MsgMsg(tr("executing query '")+query+"' ...");
    if(!q.exec(query))
    {
        m_msg()->MsgErr(q.lastError());
        return;
    }

    store.clear();
    _ch_min_verse.clear();
    _ch_max_verse.clear();

    unsigned int minv(-1),maxv(0);
    while(q.next())
    {

        unsigned int ven(q.value(1).toUInt());
        unsigned int const chapter=q.value(0).toUInt();
        QString text=q.value(2);
        if(_is_wlc)
            text=MHebrDict::prepareWLC(text);

        if(ven>maxv)
            maxv=ven;
        if(ven<minv)
            minv=ven;

        if(mode==Book){
            if(!_ch_max_verse.contains(chapter))
                _ch_max_verse.insert(chapter,ven);
            else{
                if(_ch_max_verse.value(chapter)<ven)
                    _ch_max_verse[chapter]=ven;
            }

            if(!_ch_min_verse.contains(chapter))
                _ch_min_verse.insert(chapter,ven);
            else{
                if(_ch_min_verse.value(chapter)>ven)
                    _ch_min_verse[chapter]=ven;
            }
        }

        QString verse(QString::number(chapter)+"/"+QString::number(ven));

        MTextLineItem text_item(text,true);
        text_item.setVerse(verse);
        convertTextItem(text_item,textFormat,script);

        store.append(text_item);
    }

    displayStore();
    if(mode==Book)
    {
        /*ui->mspVerse->setMinimumValue(0);
        ui->mspVerse->setMaximumValue(9999);
        ui->lblVerseMinMax->setText("0+");
        ui->mspVerse->setLastVerseActive(false);*/

        int const chapter=ui->mspChapter->currentValue();
        findChapter(chapter,_ch_min_verse.value(chapter));
    }
    else
    {
        ui->mspVerse->setMinimumValue(minv);
        ui->mspVerse->setMaximumValue(maxv);
        ui->lblVerseMinMax->setText(QString::number(minv)+" .. "+QString::number(maxv));
        ui->mspVerse->setLastVerseActive(true);

        findChapter(ui->mspChapter->currentValue(),minv);
    }

    m_msg()->MsgOk();
}

void MVersedBook::convertTextItem(MTextLineItem & text_item,TextFormat text_format,Script script)
{
    switch(text_format)
    {
        case LatTr :
        switch(script)
        {
            case CTranslit::Latin :
            text_item.setText(CTranslit::tr(text_item.text(),CTranslit::LatinTrToLatinN,false,CTranslit::RemoveNone));
            break;
            case CTranslit::Greek :
            text_item.setText(CTranslit::tr(text_item.text(),CTranslit::GreekTrToGreekN,false,CTranslit::RemoveNone));
            break;
            case CTranslit::Copt :
            text_item.setText(CTranslit::tr(text_item.text(),CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone));
            break;
            case CTranslit::Hebrew :
            text_item.setText(CTranslit::tr(text_item.text(),CTranslit::HebrewTrToHebrewN,false,CTranslit::RemoveNone));
            break;
        }
        break;
        case Native :
        {
            text_item.setText(text_item.text().trimmed());
            break;
        }
        case Beta :
        {
            text_item.setText(CTranslit::betaToUtf(text_item.text(),(CTranslit::Script)script));
            break;
        }
    }
}

void MVersedBook::on_actionConcordance_triggered()
{
    int bnum_base;
    if(key>M_WLC_MORPH)
        bnum_base=M_WLC_MORPH;
    else if(key>M_WLC_CONS)
        bnum_base=M_WLC_CONS;
    else if(key>M_WLC_VOW)
            bnum_base=M_WLC_VOW;
    else bnum_base=M_WLC_ACC;

    int const ch=ui->mspChapter->currentValue();
    ui->brBook->hebDict()->analyseVerse(key-bnum_base-1,ch,ui->mspVerse->currentValue(),mode==Chapter?ui->mspVerse->maxValue():_ch_max_verse.value(ch));
    ui->brBook->header()->setDocMode(MDocHeader::HebDict);
}

void MVersedBook::on_mspChapter_valueChanged(int value,int invoker)
{
    if(invoker==MSpinIter::Edit&&_chapter_old_value==value)
        return;

    ui->brBook->header()->setDocMode();
    if(value!=_chapter_old_value)
    {
        switch(mode)
        {
            case Book :
            {
                findChapter(ui->mspChapter->currentValue());

                unsigned int const minv=_ch_min_verse.value(value);
                unsigned int const maxv=_ch_max_verse.value(value);
                ui->mspVerse->setMinimumValue(minv);
                ui->mspVerse->setMaximumValue(maxv);
                ui->lblVerseMinMax->setText(QString::number(minv)+" .. "+QString::number(maxv));

                break;
            }
            case Chapter :
            {
                showBook(key,value);
                break;
            }
        }

        if(isSimulActivated())
            refresh_simul();
    }
    _chapter_old_value=value;
}

void MVersedBook::cursorOnTop()
{
    QRect const cr(ui->brBook->browser()->cursorRect());
    int const scr=ui->brBook->browser()->verticalScrollBar()->value(),
        wh=ui->brBook->browser()->viewport()->height();

    ui->brBook->browser()->verticalScrollBar()->setValue(scr+cr.top()+(cr.height()/2)-(wh/2));
}

void MVersedBook::on_mspVerse_valueChanged(int value,int invoker)
{
    if(invoker==MSpinIter::Edit&&_verse_old_value==value)
        return;

    ui->brBook->header()->setDocMode();

    ui->brBook->browser()->moveCursor(QTextCursor::End);
    if(!ui->brBook->browser()->find("("+QString::number(ui->mspChapter->currentValue())+"/"+QString::number(value)+")",
                 QTextDocument::FindBackward))
        ui->brBook->browser()->moveCursor(QTextCursor::Start);
    else
        cursorOnTop();

    _sbw.setStatus(ui->mspChapter->currentValue(),ui->mspVerse->currentValue());

    if(value!=_verse_old_value)
        if(isSimulActivated())
            refresh_simul();
    _verse_old_value=value;
}

void MVersedBook::findVerse(int chapter, int verse)
{
    ui->mspChapter->setCurrentValue(chapter);
    ui->mspVerse->setCurrentValue(verse);
}

void MVersedBook::findChapter(int chapter, int verse)
{
    QString v;
    if(verse==-1)
        ui->mspVerse->setCurrentValue(mode==Chapter?ui->mspVerse->minValue():_ch_min_verse.value(chapter));
    else
    {
        ui->mspVerse->setCurrentValue(verse);
        v=QString::number(verse);
    }

    ui->brBook->browser()->moveCursor(QTextCursor::Start);
    if(!ui->brBook->browser()->find("("+QString::number(chapter)+"/"+v))
        ui->brBook->browser()->moveCursor(QTextCursor::Start);
    else
        cursorOnTop();

    _sbw.setStatus(ui->mspChapter->currentValue(),ui->mspVerse->currentValue());
}

QString MVersedBook::get_query(int book, int chapter) const
{
    QString query;
    switch(mode)
    {
        case Chapter :
        {
            query="select `chapter`,`verse`,`text` from `library` where `book`="+QString::number(book)+" and `chapter`="+QString::number(chapter)+" order by `book`,`chapter`,`verse`";
            break;
        }
        case Book :
        {
            query="select `chapter`,`verse`,`text` from `library` where `book`="+QString::number(book)+" order by `book`,`chapter`,`verse`";
            break;
        }
    }
    return query;
}

bool MVersedBook::read_chapters(int book)
{
    CMySql q;
    QString query("select min(`chapter`),max(`chapter`) from `library` where `book`="+QString::number(book));

    m_msg()->MsgMsg(tr("executing query '")+query+"' ...");
    if(!q.exec(query))
    {
        m_msg()->MsgErr(q.lastError());
        return false;
    }
    if(!q.first())
    {
        m_msg()->MsgErr("something wrong");
        return false;
    }

    ui->lblChapMinMax->setText(q.value(0)+" .. "+q.value(1));
    ui->mspChapter->setMinimumValue(q.value(0).toInt());
    ui->mspChapter->setMaximumValue(q.value(1).toInt());
    //ui->mspChapter->setCurrentValue(ui->mspChapter->minValue());
    m_msg()->MsgOk();
    return true;
}

void MVersedBook::on_btShow_clicked()
{
    on_mspVerse_valueChanged(ui->mspVerse->currentValue(),MSpinIter::Button);
}

void MVersedBook::on_brBook_contentChanged(bool, bool, bool * processed)
{
    displayStore();
    *processed=true;
}

/*void MVersedBook::on_brBook_highlightActivated(bool * processed)
{
    displayStore(true);
    *processed=true;
}

void MVersedBook::on_brBook_highlightDeactivated(bool * processed)
{
    displayStore(false);
    *processed=true;
}*/

void MVersedBook::displayStore(/*bool highlight*/)
{
    QString linetemplate(m_sett()->bookRowTemplate());
    QString const note_tmpl(m_sett()->noteStyle());

    if(_is_wlc){
        linetemplate.replace("(*verse*)","&lrm;(*verse*)");
        linetemplate.replace("(*text*)","&rlm;(*text*)");
    }

    if(!ui->actionShow_table->isChecked())
    {
        linetemplate.replace("</td>","(*tab*)");
        linetemplate.replace("</tr>","(*break*)");
    }

    QString atxt;

    ui->brBook->browser()->clear();
    atxt.append(m_sett()->bookTblTemplate()+"<tbody>");

    for(int x=0;x<store.count();x++)
    {
        QString lt(linetemplate);
        QString mtext(store.at(x).text());
        if(ui->brBook->rmSpaces())
            mtext.remove(" ");
        if(ui->brBook->rmAccents()||ui->brBook->rmSpaces())
        {
            switch(script)
            {
                case CTranslit::Latin :
                mtext=CTranslit::tr(mtext,CTranslit::LatinNToLatinTr,ui->brBook->rmAccents(),ui->brBook->rmSpaces2());
                mtext=CTranslit::tr(mtext,CTranslit::LatinTrToLatinN,ui->brBook->rmAccents(),ui->brBook->rmSpaces2());
                break;
                case CTranslit::Greek :
                mtext=CTranslit::tr(mtext,CTranslit::GreekNToGreekTr,ui->brBook->rmAccents(),ui->brBook->rmSpaces2());
                mtext=CTranslit::tr(mtext,CTranslit::GreekTrToGreekN,ui->brBook->rmAccents(),ui->brBook->rmSpaces2());
                break;
                case CTranslit::Copt :
                mtext=CTranslit::tr(mtext,CTranslit::CopticNToCopticTr,ui->brBook->rmAccents(),ui->brBook->rmSpaces2());
                mtext=CTranslit::tr(mtext,CTranslit::CopticTrToCopticN,ui->brBook->rmAccents(),ui->brBook->rmSpaces2());
                break;
                case CTranslit::Hebrew :
                mtext=CTranslit::tr(mtext,CTranslit::HebrewNToHebrewTr,ui->brBook->rmAccents(),ui->brBook->rmSpaces2());
                mtext=CTranslit::tr(mtext,CTranslit::HebrewTrToHebrewN,ui->brBook->rmAccents(),ui->brBook->rmSpaces2());
                break;
            }
        }
        /*if(highlight)
            mtext=brBook->highlightText(mtext);*/


        QString const v(store.at(x).verse());
        lt.replace("(*verse*)","&nbsp;("+v+")&nbsp;");
        lt.replace("(*verse-ref*)",v+"v");
        if(store.at(x).hasNote())
            mtext.append("<p style=\""+note_tmpl+"\">"+store.at(x).note()+"</p>");

        if(_is_wlc&&ui->actionHyperlinks_to_concordance->isChecked()){
            /*QRegExp rverse("[0-9]+/[0-9]+\\)<");
            rverse.setMinimal(false);
            rverse.indexIn(v);
            QString vnum=rverse.cap();
            vnum.chop(2);*/
            lt.replace("(*text*)",mtext+QString("<td> <a href=\""+v+"c\">&lrm;analysis</a> </td>"));
        }
        else
            lt.replace("(*text*)",mtext);
        atxt.append(lt);
    }

    atxt.append("</tbody></table>");

    if(!ui->actionShow_table->isChecked())
    {
        QRegExp r("<t.*>");
        r.setMinimal(true);
        atxt.remove(r);
        atxt.replace("(*tab*)"," ");
        atxt.replace("(*break*)","<br>");
    }

    ui->brBook->browser()->setHtml(atxt);
    ui->brBook->finalizeContent();
    ui->brBook->browser()->moveCursor(QTextCursor::Start);
}

void MVersedBook::on_btCopyExt_clicked()
{
    QString t(ui->brBook->browser()->textCursor().selectedText()),
        s("*^<a href=\"ext (*name*);(*id*);(*chapter*);(*verse*);(*text*)\">Ext</a>^*");

    s.replace("(*text*)",CTranslit::tr(t,CTranslit::CopticNToCopticTr,true,CTranslit::RemoveNone));
    s.replace("(*id*)",QString::number(key));
    s.replace("(*chapter*)",QString::number(ui->mspChapter->currentValue()));
    s.replace("(*verse*)",QString::number(ui->mspVerse->currentValue()));
    s.replace("(*name*)",/*lblBookName->text().remove("( ")).replace(")","-"*/windowTitle());

    QApplication::clipboard()->setText(s);
}

void MVersedBook::on_btCopyExt2_clicked()
{
    QString t(ui->brBook->browser()->textCursor().selectedText()),
        s(";;(*name*);(*id*);(*chapter*);(*verse*);(*text*)");

    s.replace("(*text*)",CTranslit::tr(t,CTranslit::CopticNToCopticTr,true,CTranslit::RemoveNone));
    s.replace("(*id*)",QString::number(key));
    s.replace("(*chapter*)",QString::number(ui->mspChapter->currentValue()));
    s.replace("(*verse*)",QString::number(ui->mspVerse->currentValue()));
    s.replace("(*name*)",/*lblBookName->text().remove("( ")).replace(")","-"*/windowTitle());

    QApplication::clipboard()->setText(s);
}

void MVersedBook::on_tbSimulAdd_clicked(bool checked)
{
    ui->stwSimul->setCurrentIndex(checked?1:0);
}

void MVersedBook::on_tbSimulRefreshLib_clicked()
{
    m_msg()->libWidget().getSimulBooks(ui->treeSimulLibrary);
}

void MVersedBook::on_tbSimulHide_clicked()
{
    ui->wdgSimul->hide();
    ui->actionSimultaneous_reader->setChecked(false);
    ta_simul->setChecked(false);
}

void MVersedBook::on_tbSimulToList_clicked()
{
    QList<QTreeWidgetItem*> l(ui->treeSimulLibrary->selectedItems()),l2;

    for(int x=0;x<l.count();x++)
    {
        CSimulTreeItem * i((CSimulTreeItem *)l.at(x));
        if(i->_is_book)
            l2.append(i);
    }

    if(!l2.isEmpty())
    {
        for(int x=0;x<l2.count();x++)
        {
            CSimulTreeItem * si((CSimulTreeItem *)l2.at(x));
            CSimulTreeItem * sip((CSimulTreeItem *)si->parent());

            QString elabel(si->_title);
            if(sip)
                elabel.prepend(sip->_title+", ");
            MSimulItem * mi=new MSimulItem(elabel,si->_id,si->_text_format,si->_script);
            connect(mi,SIGNAL(action(int)),this,SLOT(slot_simulAction(int)));

            int const rc=ui->tblSimulTexts->rowCount();
            ui->tblSimulTexts->insertRow(rc);
            ui->tblSimulTexts->setCellWidget(rc,0,mi);
            ui->tblSimulTexts->setRowHeight(rc,mi->height());
            ui->tblSimulTexts->setCurrentCell(rc,0);
            //tblSimulTexts->scrollToItem(tblSimulTexts->item(rc,0),QAbstractItemView::PositionAtBottom);
        }
        setSimulHeaderLabels();
        ui->tblSimulTexts->scrollToBottom();
        refresh_simul();
    }
    else
        m_msg()->MsgInf(tr("at least one book must be selected!"));
}

void MVersedBook::slot_simulAction(int action)
{
    MSimulItem * si((MSimulItem *)this->sender());
    if(si)
    {
        switch(action)
        {
            case MSimulItem::Close :
            {
                for(int x=0;x<ui->tblSimulTexts->rowCount();x++)
                {
                    if(si==(MSimulItem *)ui->tblSimulTexts->cellWidget(x,0))
                        ui->tblSimulTexts->removeRow(x);
                }
                setSimulHeaderLabels();
                refresh_simul();
                break;
            }
            case MSimulItem::Change :
            refresh_simul();
            break;
        }
    }
}
bool MVersedBook::isSimulActivated() const
{
    return ui->tblSimulTexts->rowCount()>0;
}

void MVersedBook::refresh_simul()
{
    if(!ui->wdgSimul->isVisible())
        return;

    ui->tbrSimulText->clear();

    if(!isSimulActivated())
        return;

    USE_CLEAN_WAIT

    QString lines;

    QFont f(m_sett()->bFont((CTranslit::Script)script));
    f.setPointSize(f.pointSize()+_font_offset);
    ui->tbrSimulText->setFont(f);

    int const ch_a(ui->mspChapter->currentValue()),
              v_a(ui->mspVerse->currentValue());

    if(a_lead->isChecked())
    {
        QString const ch_a_s(QString::number(ch_a)),
                      v_a_s(QString::number(v_a));
        QString query("select `text` from `library` where `book`="+QString::number(key)+" and `chapter`="+ch_a_s+" and `verse`="+v_a_s);
        MQUERY(q,query);
        QString textval(tr("not available"));
        if(q.first()&&!q.isNULL(0)){
            textval=q.value(0);
            if(_is_wlc)
                textval=MHebrDict::prepareWLC(textval);
        }
        MTextLineItem line_item(textval,true);
        convertTextItem(line_item,textFormat,script);

        lines.append("<tr><td><b><small>"+ch_a_s+":"+v_a_s+"</small></b></td><td>"+line_item.text()+"</td></tr>");
    }

    for(int x=0;x<ui->tblSimulTexts->rowCount();x++)
    {
        MSimulItem * si((MSimulItem *)ui->tblSimulTexts->cellWidget(x,0));

        if(si)
        {
            int const ch=ch_a+si->chapterOffset(),
                      v=v_a+si->verseOffset(),
                      book_id=si->bookId();

            QString const ch_s(QString::number(ch)),v_s(QString::number(v));

            QString query("select `text` from `library` where `book`=*book* and `chapter`=*chapter* and `verse`=*verse*");
            query.replace(QString("*book*"),QString::number(book_id));
            query.replace(QString("*chapter*"),ch_s);
            query.replace(QString("*verse*"),v_s);

            MQUERY(q,query);

            QString textval(tr("not available"));
            if(q.first()&&!q.isNULL(0)){
                textval=q.value(0);
                if(_is_wlc)
                    textval=MHebrDict::prepareWLC(textval);
            }

            /*QFont const f(m_sett()->font((CTranslit::Script)si->textScript()));
            int const fsize(m_sett()->fontSize((CTranslit::Script)si->textScript()));*/
            /*QString const fontspec("font-family: "+f.family()+"; font-size: "+QString::number(fsize+_font_offset)+"pt;");*/

            MTextLineItem line_item(textval,true);
            convertTextItem(line_item,(TextFormat)si->textFormat(),(Script)si->textScript());

            lines.append("<tr><td><b><small>"+ch_s+":"+v_s+"</small></b></td><td>"+m_sett()->spanStringFont(line_item.text(),(CTranslit::Script)si->textScript(),_font_offset)+"</td></tr>");
        }
    }

    ui->tbrSimulText->insertHtml("<table border=\"0\" cellpadding=\"10\" cellspacing=\"0\"><tbody>"+lines+"</tbody></table>");
}

void MVersedBook::on_tbSimulUp_clicked()
{
    int idx=ui->tblSimulTexts->currentRow();
    if(idx>=1)
    {
        MSimulItem * si((MSimulItem *)ui->tblSimulTexts->cellWidget(idx,0));
        ui->tblSimulTexts->insertRow(idx-1);

        ui->tblSimulTexts->setCellWidget(idx-1,0,si);
        ui->tblSimulTexts->setRowHeight(idx-1,si->height());
        ui->tblSimulTexts->removeRow(idx+1);
        ui->tblSimulTexts->setCurrentCell(idx-1,0);

        setSimulHeaderLabels();
        refresh_simul();
    }
}

void MVersedBook::on_tbSimulDown_clicked()
{
    int idx=ui->tblSimulTexts->currentRow();
    if(idx<=ui->tblSimulTexts->rowCount()-2)
    {
        MSimulItem * si((MSimulItem *)ui->tblSimulTexts->cellWidget(idx,0));
        ui->tblSimulTexts->insertRow(idx+2);

        ui->tblSimulTexts->setCellWidget(idx+2,0,si);
        ui->tblSimulTexts->setRowHeight(idx+2,si->height());
        ui->tblSimulTexts->removeRow(idx);
        ui->tblSimulTexts->setCurrentCell(idx+1,0);

        setSimulHeaderLabels();
        refresh_simul();
    }
}

void MVersedBook::on_tbrSimulText_customContextMenuRequested(const QPoint & )
{
    bool const sel=ui->tbrSimulText->textCursor().hasSelection();

    a_dict->setEnabled(sel);
    a_crum->setEnabled(sel);
    a_lsj->setEnabled(sel);
    a_heb->setEnabled(sel);
    a_searchlib->setEnabled(sel);
    a_copy->setEnabled(sel);
    a_num->setEnabled(sel);

    QAction *a=popupSimul.exec();

    if(a)
    {
        QString const st(ui->tbrSimulText->textCursor().selectedText());

        if(a==a_dict)
        {
            if(!st.isEmpty())
            {
                if(CTranslit::isCoptic(st))
                    ui->brBook->find_word(st);
                else if(CTranslit::isHebrew(st))
                    ui->brBook->find_hebrew_word(st);
                else
                    ui->brBook->find_greek_word(st);
            }
        }
        else if(a==a_crum)
        {
            if(!st.isEmpty())
                ui->brBook->find_word(st);
        }
        else if(a==a_lsj)
        {
            if(!st.isEmpty())
                ui->brBook->find_greek_word(st);
        }
        else if(a==a_heb)
        {
            if(!st.isEmpty())
                ui->brBook->find_hebrew_word(st);
        }
        else if(a==a_searchlib)
        {
            if(!st.isEmpty())
                ui->brBook->searchLibrary(st);
        }
        else if(a==a_num)
        {
            if(!st.isEmpty())
                ui->brBook->convert_number(st);
        }
        else if(a==a_copy)
        {
            ui->tbrSimulText->copy();
        }
        else if(a==a_copyall)
        {
            QTextCursor tc(ui->tbrSimulText->document());
            tc.select(QTextCursor::Document);
            QApplication::clipboard()->setText(tc.selectedText());
        }
        else if(a==a_incf)
        {
            _font_offset+=1;
            refresh_simul();
        }
        else if(a==a_decf)
        {
            _font_offset-=1;
            refresh_simul();
        }
        else if(a==a_normf)
        {
            _font_offset=0;
            refresh_simul();
        }
        else if(a==a_lead)
        {
            refresh_simul();
        }
        else if(a==a_wrap)
        {
            ui->tbrSimulText->setWordWrapMode(a_wrap->isChecked()?QTextOption::WordWrap:QTextOption::NoWrap);
        }
        else if(a==a_next)
        {
            on_tbSimulNext_clicked();
        }
        else if(a==a_prev)
        {
            on_tbSimulPrev_clicked();
        }
    }
}

void MVersedBook::on_tbSimulAction_clicked(bool checked)
{
    if(checked)
    {
        popupSimul.setButton(ui->tbSimulAction);
        on_tbrSimulText_customContextMenuRequested(QPoint());
    }
}

void MVersedBook::on_tbSimulPrev_clicked()
{
    ui->mspVerse->on_tbPrev_clicked();
}

void MVersedBook::on_tbSimulNext_clicked()
{
   ui-> mspVerse->on_tbNext_clicked();
}

void MVersedBook::on_treeSimulLibrary_customContextMenuRequested(const QPoint &)
{
    bool one_book=false;
    QList<QTreeWidgetItem*> l(ui->treeSimulLibrary->selectedItems());
    for(int x=0;x<l.count();x++)
    {
        CSimulTreeItem * i=(CSimulTreeItem *)l.at(x);
        if(i->_is_book)
        {
            one_book=true;
            break;
        }
    }

    ac_move->setEnabled(one_book);

    QAction * a=popupSimulC.exec(QCursor::pos());
    if(a)
    {
        if(a==ac_move)
        {
            if(one_book)
                on_tbSimulToList_clicked();
        }
        else if(a==ac_refresh)
        {
            on_tbSimulRefreshLib_clicked();
        }
    }
}

void MVersedBook::on_tblSimulTexts_customContextMenuRequested(const QPoint &)
{
    int const idx=ui->tblSimulTexts->currentRow();
    al_remove->setEnabled(idx>=0);

    QAction * a=popupSimulL.exec(QCursor::pos());

    if(a)
    {
        if(a==al_remove&&idx>=0)
        {
            MSimulItem * i((MSimulItem *)ui->tblSimulTexts->cellWidget(idx,0));
            if(i)
                i->on_tbRemove_clicked();
        }
        else if(a==al_rmall)
        {
            while(ui->tblSimulTexts->rowCount()>0)
                ui->tblSimulTexts->removeRow(0);
            refresh_simul();
        }
    }
}

void MVersedBook::setSimulHeaderLabels()
{
    int const max=ui->tblSimulTexts->rowCount();
    QString const max_s(QString::number(max));
    QStringList l;
    for(int x=0;x<max;x++)
        l.append(QString::number(x+1)+"/"+max_s);
    ui->tblSimulTexts->setVerticalHeaderLabels(l);
}

/*void MVersedBook::on_tbSimulFontPlus_clicked()
{
    _font_offset+=1;
    refresh_simul();
}

void MVersedBook::on_tbSimulFontMinus_clicked()
{
    _font_offset-=1;
    refresh_simul();
}*/

void MVersedBook::on_actionClose_triggered()
{
    close();
}

void MVersedBook::on_actionChapter_by_chapter_triggered()
{
    if(mode!=Chapter)
    {
        ui->brBook->header()->setDocMode();
        mode=Chapter;
        //_chapter_old_value=_verse_old_value=-1;
        int const v=ui->mspVerse->currentValue();
        showBook(key,ui->mspChapter->currentValue());
        ui->mspVerse->setCurrentValue(v);
        _sbw.setStatusMode(false);
        ta_entire->setIcon(QIcon(":/new/icons/icons/entire.png"));
        ta_entire->setChecked(false);
    }
}

void MVersedBook::on_actionEntire_book_triggered()
{
    if(mode!=Book)
    {
        ui->brBook->header()->setDocMode();
        mode=Book;
        //_chapter_old_value=_verse_old_value=-1;
        int const v=ui->mspVerse->currentValue();
        showBook(key,ui->mspChapter->currentValue());
        ui->mspVerse->setCurrentValue(v);
        _sbw.setStatusMode(true);
        ta_entire->setIcon(QIcon(":/new/icons/icons/part.png"));
        ta_entire->setChecked(true);
    }
}

void MVersedBook::on_actionHyperlinks_to_concordance_triggered()
{
    ui->brBook->header()->setDocMode();

    USE_CLEAN_WAIT
    displayStore();
}

void MVersedBook::slot_activateSR()
{
    QAction * a=(QAction*)this->sender();
    ui->actionSimultaneous_reader->setChecked(!a->isChecked());
    ui->actionSimultaneous_reader->trigger();
}

void MVersedBook::on_actionSimultaneous_reader_triggered(bool checked)
{
    if(checked)
    {
        ui->brBook->header()->setDocMode();
        if(ui->treeSimulLibrary->topLevelItemCount()<1)
            on_tbSimulRefreshLib_clicked();
        ui->wdgSimul->setVisible(true);
        refresh_simul();
    }
    else
        on_tbSimulHide_clicked();
}

void MVersedBook::on_actionFind_triggered()
{
    ui->brBook->header()->setDocMode();
    ui->brBook->setPanelVisibility(true);
}

void MVersedBook::on_actionSave_as_triggered()
{
    ui->brBook->saveAs();
}

void MVersedBook::on_actionShow_table_triggered()
{
    ui->brBook->header()->setDocMode();

    USE_CLEAN_WAIT
    displayStore();
}

void MVersedBook::on_actionGr_Lat_dictionary_triggered()
{
    ui->brBook->gkDict();
    ui->brBook->header()->setDocMode(MDocHeader::GkDict);
}

void MVersedBook::on_actionCoptic_dictionary_triggered()
{
    ui->brBook->copDict();
    ui->brBook->header()->setDocMode(MDocHeader::CopDict);
}

void MVersedBook::on_actionNumeric_convertor_triggered()
{
    ui->brBook->copNum();
    ui->brBook->header()->setDocMode(MDocHeader::NumConv);
}

void MVersedBook::on_action_Hebrew_dictionary_triggered()
{
    ui->brBook->hebDict();
    ui->brBook->header()->setDocMode(MDocHeader::HebDict);
}

void MVersedBook::on_actionT_oolbar_triggered(bool checked)
{
    ui->tbarTools->setVisible(checked);
}

//

 CSimulTreeItem::CSimulTreeItem(bool is_book,QString const & title,int id,int text_format,int script)
     :QTreeWidgetItem(0),
       _is_book(is_book),
       _title(title),
       _id(id),
       _text_format(text_format),
       _script(script)
 {}
