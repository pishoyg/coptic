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

#include "booktextbrowser.h"
#include "ui_booktextbrowser.h"

CBookTextBrowser::CBookTextBrowser(QWidget *parent) :
    QWidget(parent),
    is_finalized(false),
    ui(new Ui::CBookTextBrowser()),
    popup(),_title(),lasturl(),
    orig_text(0)
{
    ui->setupUi(this);

    ui->wdgDictHeader->initFirstButton(QIcon(":/new/icons/icons/txt_file.png"),tr("&text"));
    ui->wdgDictHeader->setStWdg(ui->stwContent);

    connect(ui->txtFind,SIGNAL(textChanged(QString const&)),this,SLOT(slot_input_textChanged(QString const &)));

    s_dict=popup.addAction(tr("&dictionary (autodetect)"));
    s_dict->setShortcut(QKeySequence("Ctrl+Meta+A"));
    s_crum=popup.addAction(QIcon(":/new/icons/icons/gima.png"),tr("search in &Coptic dictionary"));
    s_crum->setShortcut(QKeySequence("Ctrl+Meta+C"));
    s_lsj=popup.addAction(QIcon(":/new/icons/icons/alfa2.png"),tr("search in &Gk/Lat dictionary"));
    s_lsj->setShortcut(QKeySequence("Ctrl+Meta+L"));
    s_heb=popup.addAction(QIcon(":/new/icons/icons/abgd.png"),tr("search in &Hebrew dictionary"));
    s_heb->setShortcut(QKeySequence("Ctrl+Meta+H"));
    s_numconv=popup.addAction(QIcon(":/new/icons/icons/numcnv.png"),tr("con&vert number"));
    s_numconv->setShortcut(QKeySequence("Ctrl+Meta+N"));
    searchlib=popup.addAction(QIcon(":/new/icons/icons/loupe.png"),tr("&search in library"));
    searchlib->setShortcut(QKeySequence("Ctrl+Meta+S"));
    popup.addSeparator();
    (a_find=popup.addAction(QIcon(":/new/icons/icons/loupe.png"),tr("fi&nd")))->setShortcut(QKeySequence("Ctrl+F"));
    (copy=popup.addAction(QIcon(":/new/icons/icons/copy.png"),tr("c&opy")))->setShortcut(QKeySequence("Ctrl+C"));
    copyall=popup.addAction(tr("copy &all"));
    popup.addSeparator();
    (find=popup.addAction(tr("show/hide &panel")))->setShortcut(QKeySequence("Ctrl+P"));
    find->setCheckable(true);
    (show_inf=popup.addAction(QIcon(":/new/icons/icons/info.png"),tr("show/hide &info")))->setCheckable(true);
    show_inf->setShortcut(QKeySequence("Ctrl+I"));
    popup.addSeparator();
    QList<QKeySequence> kseq=QList<QKeySequence>()
            << QKeySequence(Qt::ControlModifier+Qt::Key_M)
            << QKeySequence(Qt::ControlModifier+Qt::Key_Plus);
    (inc_font=popup.addAction(QIcon(":/new/icons/icons/loupe_plus.png"),tr("&larger font")))->setShortcuts(kseq);
    kseq=QList<QKeySequence>()
                << QKeySequence(Qt::ControlModifier+Qt::Key_N)
                << QKeySequence(Qt::ControlModifier+Qt::Key_Minus);
    (dec_font=popup.addAction(QIcon(":/new/icons/icons/loupe_minus.png"),tr("s&maller font")))->setShortcuts(kseq);
    popup.addSeparator();
    show_html=popup.addAction(tr("show html"));
    //show_inf->setChecked(true);

    ui->cbWrap->setChecked(!(ui->br->wordWrapMode()==QTextOption::NoWrap));

    on_btHide_clicked();

}

CBookTextBrowser::~CBookTextBrowser()
{
    deleteOrigText();
    delete ui;
}

//

CLatCopt const & CBookTextBrowser::inputBox() const {return *ui->txtFind;}
CLatCopt & CBookTextBrowser::inputBox() {return *ui->txtFind;}

QTextBrowser * CBookTextBrowser::browser(){return ui->br;}

void CBookTextBrowser::disableDictionaries(bool lsj)
{
    s_dict->setVisible(false);
    s_crum->setVisible(false);
    s_heb->setVisible(false);
    if(!lsj)
        s_lsj->setVisible(false);
}

void CBookTextBrowser::find_hebrew_word(QString const & word)
{
    emit dictionaryRequested(HebrewD,word);
}
void CBookTextBrowser::find_greek_word(QString const & word)
{
    emit dictionaryRequested(LSJ,word);
}
void CBookTextBrowser::find_word(QString const & word)
{
    emit dictionaryRequested(Crum,word);
}
void CBookTextBrowser::convert_number(QString const & number)
{
    emit dictionaryRequested(NumConvert,number);
}
void CBookTextBrowser::searchLibrary(QString const & text)
{
    m_msg()->libSearchWidget().searchCoptic(text);
}

void CBookTextBrowser::init(QString const & title,
        Script script,
        bool change_font
        )
{
    _title=title;
    CBookTextBrowser::script=script;
    ui->txtFind->setScript((CTranslit::Script)script);

    ui->cbAllowFont->setChecked(change_font);

    QFont f(m_sett()->bFont((CTranslit::Script)script));
    setFont(f);
}

void CBookTextBrowser::saveAs()
{
    on_btSaveAs_clicked();
}

void CBookTextBrowser::on_br_customContextMenuRequested(QPoint )
{
    bool
            sel=ui->br->textCursor().hasSelection(),
            fnt=ui->cbAllowFont->isChecked();

    s_dict->setEnabled(sel);
    s_crum->setEnabled(sel);
    s_lsj->setEnabled(sel);
    s_heb->setEnabled(sel);
    s_numconv->setEnabled(sel);
    searchlib->setEnabled(sel);
    copy->setEnabled(sel);

    inc_font->setEnabled(fnt);
    dec_font->setEnabled(fnt);

    show_inf->setChecked(ui->wdgInfo->isVisible());
    find->setChecked(ui->widget->isVisible());
    QAction * a;
    if((a=popup.exec()))
    {
        QString const st(ui->br->textCursor().selectedText());
        if(a==s_dict)
        {
            if(!st.isEmpty())
            {
                if(CTranslit::isCoptic(st))
                    find_word(st);
                else if(CTranslit::isHebrew(st))
                    find_hebrew_word(st);
                else
                    find_greek_word(st);
            }
        }
        else if(a==s_crum)
        {
            if(!st.isEmpty())
                find_word(st);
        }
        else if(a==s_lsj)
        {
            if(!st.isEmpty())
                find_greek_word(st);
        }
        else if(a==s_heb)
        {
            if(!st.isEmpty())
                find_hebrew_word(st);
        }
        else if(a==s_numconv)
        {
            if(!st.isEmpty())
                convert_number(st);
        }
        else if(a==a_find)
        {
            findSelected();
        }
        else if(a==copy)
        {
            ui->br->copy();
        }
        else if(a==copyall)
        {
            copyAll();
        }
        else if(a==find)
        {
            ui->widget->setVisible(!ui->widget->isVisible());
        }
        else if(a==inc_font)
        {
            ui->spnFSize->setValue(ui->spnFSize->value()+1);
        }
        else if(a==dec_font)
        {
            ui->spnFSize->setValue(ui->spnFSize->value()-1);
        }
        else if(a==show_html)
        {
            ui->br->setPlainText(ui->br->toHtml());
        }
        else if(a==searchlib)
        {
            if(!st.isEmpty())
                searchLibrary(st);
        }
        else if(a==show_inf)
        {
            ui->wdgInfo->setVisible(show_inf->isChecked());
        }
    }
}

void CBookTextBrowser::on_btFind_clicked()
{
    QString ft(ui->txtFind->text_utf8());
    if(ft.isEmpty())
        return;

    //USE_CLEAN_WAIT

    QRegExp rft(ft,Qt::CaseInsensitive);
    rft.setMinimal(true);

    bool reg(ui->cmbType->currentIndex()==1),wrds(ui->cbWordsOnly->isChecked());

    if(wrds)
    {
        USE_CLEAN_WAIT

        CProgressDialog pd;
        QTime time;
        time.start();
        bool prg(false);

        QTextCursor tc(ui->br->textCursor());
        QTextDocument * newtd(ui->br->document());
        bool catched(false);

        if(tc.hasSelection())
            tc.movePosition(QTextCursor::NextWord,QTextCursor::MoveAnchor,1);
        do
        {
            PRGD(tr("detecting occurrence ..."))

            QTextCursor snc(tc);
            snc.select(QTextCursor::WordUnderCursor);
            QString st(snc.selectedText());
            if(reg)
            {
                if(rft.indexIn(st)!=-1)
                {
                    //fnc=fnc.document()->find(rft,nc);
                    catched=true;
                    break;
                }
            }
            else
            {
                if(st.contains(ft,Qt::CaseInsensitive))
                {
                    //fnc=fnc.document()->find(ft,nc);
                    catched=true;
                    break;
                }
            }
        }while(tc.movePosition(QTextCursor::NextWord,QTextCursor::MoveAnchor,1));

        if(!catched)
            ui->br->moveCursor(QTextCursor::End);
        else
        {
            if(tc.isNull())
                ui->br->moveCursor(QTextCursor::End);
            else
            {
                tc.select(QTextCursor::WordUnderCursor);
                ui->br->setTextCursor(tc);
            }
        }
        /*QTextCursor nc;
        if(reg)
            nc=br->document()->find(rft,br->textCursor(),QTextDocument::FindWholeWords);
        else
            nc=br->document()->find(ft,br->textCursor(),QTextDocument::FindWholeWords);

        if(nc.isNull())
            br->moveCursor(QTextCursor::End);
        else
            br->setTextCursor(nc);*/
    }
    else
    {
        QTextCursor nc;
        if(reg)
            nc=ui->br->document()->find(rft,ui->br->textCursor());
        else
            nc=ui->br->document()->find(ft,ui->br->textCursor());

        if(nc.isNull())
            ui->br->moveCursor(QTextCursor::End);
        else
            ui->br->setTextCursor(nc);
    }
}

void CBookTextBrowser::on_btHide_clicked()
{
    ui->widget->setVisible(false);
}

void CBookTextBrowser::on_cmbF_currentFontChanged(QFont f)
{
    if(ui->cbAllowFont->isChecked())
    {
        QFont nf(f);
        nf.setPointSize(ui->spnFSize->value());
        ui->br->setFont(nf);
        if(orig_text)
            orig_text->setDefaultFont(nf);
    }
}

void CBookTextBrowser::on_spnFSize_valueChanged(int newvalue)
{
    if(ui->cbAllowFont->isChecked())
    {
        QFont nf(ui->cmbF->currentFont());
        nf.setPointSize(newvalue);
        ui->br->setFont(nf);
        if(orig_text)
            orig_text->setDefaultFont(nf);
    }
}

void CBookTextBrowser::on_btTop_clicked()
{
    ui->br->moveCursor(QTextCursor::Start);
}

void CBookTextBrowser::slot_input_textChanged(QString const &)
{
    //btHLText->setChecked(false);
    //br->moveCursor(QTextCursor::PreviousWord);
    //br->find(str);
    QTime time;
    time.start();

    on_btTop_clicked();
    on_btFind_clicked();

    if(time.elapsed()>2000&&ui->cbWordsOnly->isChecked())
    {
        m_msg()->MsgInf(tr("Document is too large, 'words' option disabled."));
        ui->cbWordsOnly->setChecked(false);
    }
}

void CBookTextBrowser::on_cbRmAccents_clicked(bool checked)
{

    bool processed=false;
    emit contentChanged(checked,ui->cbRmSpaces->isChecked(),&processed);

    if(!processed)
        highlight();
}

void CBookTextBrowser::on_cbRmSpaces_clicked(bool checked)
{

    bool processed=false;
    emit contentChanged(ui->cbRmAccents->isChecked(), checked, &processed);

    if(!processed)
        highlight();

}

bool CBookTextBrowser::rmAccents() const
{
    return ui->cbRmAccents->isChecked();
}

bool CBookTextBrowser::rmSpaces() const
{
    return ui->cbRmSpaces->isChecked();
}

CTranslit::SpaceMode CBookTextBrowser::rmSpaces2() const
{
    return ui->cbRmSpaces->isChecked()?
                CTranslit::RemoveAll:
                CTranslit::RemoveNone;
}

bool CBookTextBrowser::isHighlightChecked() const
{
    return ui->btHLText->isChecked();
}

void CBookTextBrowser::on_btHLText_clicked(bool )
{
        highlight();
}

bool CBookTextBrowser::highlight()
{
    USE_CLEAN_WAIT

    setOrigText();
    restoreOrigText();

    //messages->MsgMsg("HL activated");

    QTextDocument * newtd(ui->br->document()->clone());
    QTextCursor tc(newtd);

    if(newtd)
    {
        CProgressDialog pd;
        bool prg(false);
        QTime time;
        time.start();

        if(rmAccents()&&!is_finalized)
        {
            tc.movePosition(QTextCursor::Start);
            do
            {
                PRGD(tr("removing non-word chars ..."))

                tc.select(QTextCursor::WordUnderCursor);
                QString wrd(tc.selectedText());

                if(CTranslit::isGreek(wrd))
                {
                    wrd=CTranslit::tr(wrd,CTranslit::GreekNToGreekTr,true,CTranslit::RemoveNone);
                    wrd=CTranslit::tr(wrd,CTranslit::GreekTrToGreekN,false,CTranslit::RemoveNone);
                }
                else if(CTranslit::isCoptic(wrd))
                {
                    wrd=CTranslit::tr(wrd,CTranslit::CopticNToCopticTr,true,CTranslit::RemoveNone);
                    wrd=CTranslit::tr(wrd,CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone);
                }
                else if(CTranslit::isHebrew(wrd))
                {
                    wrd=CTranslit::tr(wrd,CTranslit::HebrewNToHebrewTr,true,CTranslit::RemoveNone);
                    wrd=CTranslit::tr(wrd,CTranslit::HebrewTrToHebrewN,false,CTranslit::RemoveNone);
                }
                else
                {
                    wrd=CTranslit::tr(wrd,CTranslit::LatinNToLatinTr,true,CTranslit::RemoveNone);
                    wrd=CTranslit::tr(wrd,CTranslit::LatinTrToLatinN,false,CTranslit::RemoveNone);
                }

                tc.removeSelectedText();
                tc.insertText(wrd);
            }while(tc.movePosition(QTextCursor::NextWord));
        }

        if(rmSpaces()&&!is_finalized)
        {
            PRGD_RESTART(tr("removing spaces ..."))

            tc.movePosition(QTextCursor::Start);
            while(!(tc=newtd->find(" ",tc,0)).isNull())
            {
                PRGD(tr("removing spaces ..."))

                tc.removeSelectedText();
            }
        }

        if(isHighlightChecked())
        {
            QString t(ui->txtFind->text_utf8());
            if(!t.count()>0)
                ui->btHLText->setChecked(false);
            else
            {
                QTextCharFormat cf;
                cf.setForeground(m_sett()->HTfgC());
                cf.setBackground(m_sett()->HTbgC());


                QRegExp rt(t,Qt::CaseInsensitive);
                rt.setMinimal(true);

                bool reg(ui->cmbType->currentIndex()==1),wrds(ui->cbWordsOnly->isChecked());

                PRGD_RESTART(tr("highlighting text ..."))

                tc.movePosition(QTextCursor::Start);
                if(wrds)
                {
                    do
                    {
                        PRGD(tr("highlighting text ..."))

                        QTextCursor ntc(tc);
                        ntc.select(QTextCursor::WordUnderCursor);
                        QString st(ntc.selectedText());
                        if(reg)
                        {
                            if(rt.indexIn(st)!=-1)
                                ntc.mergeCharFormat(cf);
                        }
                        else
                        {
                            if(st.contains(t,Qt::CaseInsensitive))
                                ntc.mergeCharFormat(cf);
                        }
                    }while(tc.movePosition(QTextCursor::NextWord,QTextCursor::MoveAnchor,1));

                }
                else
                {
                    if(reg)
                    {
                        int tcp(tc.position());
                        while(!(tc=newtd->find(rt,tc)).isNull())
                        {
                            PRGD(tr("highlighting text ..."))

                            if(tc.position()<=tcp)
                            {
                                tc.setPosition(++tcp,QTextCursor::MoveAnchor);
                                if(tc.atEnd())
                                    break;
                                else
                                    continue;
                            }
                            tcp=tc.position();

                            tc.mergeCharFormat(cf);
                        }
                    }
                    else
                        while(!(tc=newtd->find(t,tc)).isNull())
                        {
                            PRGD(tr("highlighting text ..."))

                            tc.mergeCharFormat(cf);
                        }
                }
            }
        }

        ui->br->setDocument(newtd);
    }


    return true;
}

void CBookTextBrowser::finalizeContent()
{
    ui->btHLText->setChecked(false);
    deleteOrigText();
    setOrigText();
    is_finalized=true;
}

void CBookTextBrowser::clear()
{
    ui->br->clear();
    deleteOrigText();
    is_finalized=false;
}

void CBookTextBrowser::setOrigText()
{
    if(!orig_text)
        orig_text=ui->br->document()->clone();
}

void CBookTextBrowser::restoreOrigText()
{
    if(orig_text)
        ui->br->setDocument(orig_text);
}

void CBookTextBrowser::deleteOrigText()
{
    if(orig_text)
    {
        delete orig_text;
        orig_text=0;
    }
}

/*QString CBookTextBrowser::origText() const
{
    return orig_text;
}*/

void CBookTextBrowser::setPanelVisibility(bool visible)
{
    ui->widget->setVisible(visible);
}

void CBookTextBrowser::setInfoPanelVisibility(bool visible)
{
    ui->wdgInfo->setVisible(visible);
    show_inf->setChecked(visible);
}

/*void CBookTextBrowser::setPanelText(QString const & text)
{
    txtFind->setText(text);
}*/

/*QString CBookTextBrowser::highlightText(QString const & oldtext) const
{
    QString text(oldtext);

    if(cmbType->currentIndex()==1)
    {
        QRegExp r(inputBox().text_utf8());
        r.setMinimal(true);

        if(cbWordsOnly->isChecked())
        {
            QStringList splitted(text.split(" ",QString::KeepEmptyParts));
            text.clear();
            for(int x=0;x<splitted.count();x++)
            {
                QString bkps(splitted[x]);

                QString htxt;
                int p=-1;
                while((p=r.indexIn(bkps))!=-1)
                {
                    bool is_tag(CTranslit::isTag(bkps,p));
                    QString ms(r.cap(0));
                    QString pss(bkps.left(p+r.matchedLength()));
                    bkps.remove(0,p+r.matchedLength());
                    if(!is_tag)
                        pss.replace(ms,QString("<span style=\"color: "+messages->settings().HTfgColor()+"; background-color: "+messages->settings().HTbgColor()+"\">"+ms+"</span>"));
                    htxt.append(pss);
                }
                htxt.append(bkps);
                text.append(htxt+" ");
            }
            return text.trimmed();
        }
        else
        {
            QString htxt;
            int p=-1;
            while((p=r.indexIn(text))!=-1)
            {
                bool is_tag(CTranslit::isTag(text,p));
                QString ms(r.cap(0));
                QString pss(text.left(p+r.matchedLength()));
                text.remove(0,p+r.matchedLength());
                if(!is_tag)
                    pss.replace(ms,QString("<span style=\"color: "+messages->settings().HTfgColor()+"; background-color: "+messages->settings().HTbgColor()+"\">"+ms+"</span>"));
                htxt.append(pss);
            }
            htxt.append(text);
            return htxt;
        }
        return text;
    }
    else
        return text.replace(inputBox().text_utf8(),QString("<span style=\"color: "+messages->settings().HTfgColor()+"; background-color: "+messages->settings().HTbgColor()+"\">"+inputBox().text_utf8()+"</span>"));
}*/

void CBookTextBrowser::setWordsChecked(bool checked)
{
    ui->cbWordsOnly->setChecked(checked);
}

bool CBookTextBrowser::isWordsChecked() const
{
    return ui->cbWordsOnly->isChecked();
}

void CBookTextBrowser::on_cmbType_currentIndexChanged(int )
{
    highlight();
    slot_input_textChanged(QString());
}

void CBookTextBrowser::on_cbWordsOnly_toggled(bool )
{
    highlight();
    slot_input_textChanged(QString());
}

void CBookTextBrowser::keyPressEvent(QKeyEvent * event)
{
    event->ignore();
    if(event->modifiers()==0&&event->key()==Qt::Key_Escape)
    {
        ui->btHide->click();
        event->accept();
    }

    if(event->modifiers()==(Qt::ControlModifier+Qt::MetaModifier))
    {
        QString const st(ui->br->textCursor().selectedText());
        switch(event->key())
        {
        case Qt::Key_A :
            if(!st.isEmpty())
            {
                if(CTranslit::isCoptic(st))
                    find_word(st);
                else if(CTranslit::isHebrew(st))
                    find_hebrew_word(st);
                else
                    find_greek_word(st);
            }
            event->accept();
        break;
        case Qt::Key_C :
            if(!st.isEmpty())
                    find_word(st);
            event->accept();
        break;
        case Qt::Key_L :
            if(!st.isEmpty())
                        find_greek_word(st);
            event->accept();
        break;
        case Qt::Key_S :
            if(!st.isEmpty())
                searchLibrary(st);
            event->accept();
        break;
        case Qt::Key_N :
            if(!st.isEmpty())
                convert_number(st);
            event->accept();
        break;
        }
    }

    if(event->modifiers()==Qt::ControlModifier)
    {
        switch(event->key())
        {
        case Qt::Key_P :
        ui->widget->setVisible(!ui->widget->isVisible());
        event->accept();
        break;
        case Qt::Key_I :
        ui->wdgInfo->setVisible(!ui->wdgInfo->isVisible());
        event->accept();
        break;
        case Qt::Key_Plus :
        case Qt::Key_M :
        ui->spnFSize->setValue(ui->spnFSize->value()+1);
        event->accept();
        break;
        case Qt::Key_Minus :
        case Qt::Key_N :
        ui->spnFSize->setValue(ui->spnFSize->value()-1);
        event->accept();
        break;
        case Qt::Key_C :
        ui->br->copy();
        event->accept();
        break;
        case Qt::Key_F :
        findSelected();
        event->accept();
        break;

        default:
        //event->ignore();
        //QWidget::keyPressEvent(event);
        break;
        }
    }

    if(!event->isAccepted())
        QWidget::keyPressEvent(event);
}

void CBookTextBrowser::findSelected()
{
    ui->widget->setVisible(true);
    ui->tabOpts->setCurrentIndex(0);
    if(ui->br->textCursor().hasSelection())
    {
        QString const s(ui->br->textCursor().selectedText());
        ui->txtFind->setSwitchState(false);
        ui->txtFind->setText(s);
    }
}

void CBookTextBrowser::setExact()
{
    ui->cmbType->setCurrentIndex(0);
}

void CBookTextBrowser::setRegExp()
{
    ui->cmbType->setCurrentIndex(1);
}

bool CBookTextBrowser::isRegExp() const
{
    return ui->cmbType->currentIndex()==1;
}

void CBookTextBrowser::on_btBottom_clicked()
{
    ui->br->moveCursor(QTextCursor::End);
}

void CBookTextBrowser::on_btFindUp_clicked()
{
    QString ft(ui->txtFind->text_utf8());

    if(ft.isEmpty())
        return;

    //USE_CLEAN_WAIT

    QRegExp rft(ft,Qt::CaseInsensitive);
    rft.setMinimal(true);

    bool reg(ui->cmbType->currentIndex()==1),wrds(ui->cbWordsOnly->isChecked());

    if(wrds)
    {
        USE_CLEAN_WAIT

        CProgressDialog pd;
        QTime time;
        time.start();
        bool prg(false);

        QTextCursor tc(ui->br->textCursor());
        QTextDocument * newtd(ui->br->document());
        bool catched(false);

        if(tc.hasSelection())
        {
            tc.setPosition(tc.selectionStart());
            tc.movePosition(QTextCursor::StartOfWord);
            tc.movePosition(QTextCursor::PreviousWord,QTextCursor::MoveAnchor,1);
        }

        do
        {
            PRGD(tr("detecting occurrence ..."))

            QTextCursor snc(tc);
            snc.select(QTextCursor::WordUnderCursor);
            QString st(snc.selectedText());
            if(reg)
            {
                if(rft.indexIn(st)!=-1)
                {
                    //fnc=fnc.document()->find(rft,nc);
                    catched=true;
                    break;
                }
            }
            else
            {
                if(st.contains(ft,Qt::CaseInsensitive))
                {
                    //fnc=fnc.document()->find(ft,nc);
                    catched=true;
                    break;
                }
            }
        }while(tc.movePosition(QTextCursor::PreviousWord,QTextCursor::MoveAnchor,1));

        if(!catched)
            ui->br->moveCursor(QTextCursor::Start);
        else
        {
            if(tc.isNull())
                ui->br->moveCursor(QTextCursor::Start);
            else
            {
                tc.select(QTextCursor::WordUnderCursor);
                ui->br->setTextCursor(tc);
            }
        }
        /*QTextCursor nc;
        if(reg)
            nc=br->document()->find(rft,br->textCursor(),QTextDocument::FindBackward|QTextDocument::FindWholeWords);
        else
            nc=br->document()->find(ft,br->textCursor(),QTextDocument::FindBackward|QTextDocument::FindWholeWords);
        if(nc.isNull())
            br->moveCursor(QTextCursor::Start);
        else
            br->setTextCursor(nc);*/
    }
    else
    {
        QTextCursor nc;
        if(reg)
            nc=ui->br->document()->find(rft,ui->br->textCursor(),QTextDocument::FindBackward);
        else
            nc=ui->br->document()->find(ft,ui->br->textCursor(),QTextDocument::FindBackward);
        if(nc.isNull())
            ui->br->moveCursor(QTextCursor::Start);
        else
            ui->br->setTextCursor(nc);
    }
}

void CBookTextBrowser::allowChangeScript()
{
    ui->txtFind->allowChangeScript();
}

void CBookTextBrowser::on_btAction_clicked(bool checked)
{
    if(checked)
    {
        popup.setButton(ui->btAction);
        on_br_customContextMenuRequested(QPoint());
    }
}

void CBookTextBrowser::on_br_textChanged()
{
    ui->lblInf->setText(QString::number(ui->br->document()->lineCount()));
    ui->lblChar->setText(QString::number(ui->br->document()->characterCount()));
}

void CBookTextBrowser::on_btSaveAs_clicked()
{
    QFileDialog fd(this,tr("save document"),QString(),"html files (*.html *.htm);;text files (*.txt);;all files (*)");
    fd.setFileMode(QFileDialog::AnyFile);
    fd.setAcceptMode(QFileDialog::AcceptSave);
    if(fd.exec()==QDialog::Accepted)
    {
        if(fd.selectedFiles().count()>0)
        {
            QString fn(fd.selectedFiles().first());
            QFile f(fn);
            if(f.open(QIODevice::WriteOnly))
            {
                int e;
                bool ishtml;
                if((ishtml=(fd.selectedFilter().startsWith("html files"))))
                    e=f.write(ui->br->document()->toHtml().toUtf8());
                else
                    e=f.write(ui->br->document()->toPlainText().toUtf8());

                if(e==-1)
                    m_msg()->MsgErr(tr("cannot write into file '")+f.fileName()+"'");
                else
                {
                    m_msg()->MsgInf(QString(ishtml?"html":"txt")+tr(" file '")+f.fileName()+tr("' saved"));
                    m_msg()->MsgOk();
                }
                f.close();
            }
            else
                m_msg()->MsgErr(tr("cannot open file '")+f.fileName()+tr("' for writing"));
        }
    }
}

void CBookTextBrowser::on_cbWrap_clicked(bool checked)
{
    if(checked)
        ui->br->setWordWrapMode(QTextOption::WordWrap);
    else
        ui->br->setWordWrapMode(QTextOption::NoWrap);
}

void CBookTextBrowser::on_br_sourceChanged(QUrl url)
{
    url.setFragment(QString::null);
    if(url!=lasturl)
    {
        ui->cbRmAccents->setChecked(false);
        ui->cbRmSpaces->setChecked(false);
        ui->btHLText->setChecked(false);
        deleteOrigText();
        //setOrigText();

        //messages->MsgMsg("source changed from "+lasturl.toString()+" to "+url.toString());

        lasturl=url;
        //prg=false;
        m_msg()->MsgMsg(tr("page loaded: ")+lasturl.toString());
    }
    //messages->MsgMsg("reloaded");
}

void CBookTextBrowser::beforeReload()
{
    lasturl.clear();
}

void CBookTextBrowser::on_cbAllowFont_clicked(bool checked)
{
    if(checked)
        on_spnFSize_valueChanged(ui->spnFSize->value());
    else
    {
        ui->br->setFont(QFont());
        if(orig_text)
            orig_text->setDefaultFont(QFont());
    }
}

void CBookTextBrowser::on_br_backwardAvailable(bool available)
{
    emit historyFBChanged(Backward,available);
}

void CBookTextBrowser::on_br_forwardAvailable(bool available)
{
    emit historyFBChanged(Forward,available);
}

void CBookTextBrowser::setFont(QFont const & f)
{
    ui->cmbF->setCurrentFont(f);
    ui->spnFSize->setValue(f.pointSize());
}

void CBookTextBrowser::highlightText(bool highlight)
{
    if(isHighlightChecked()!=highlight)
        ui->btHLText->click();
}

void CBookTextBrowser::copyAll() const
{
    QTextCursor tc(ui->br->document());
    tc.select(QTextCursor::Document);
    QApplication::clipboard()->setText(tc.selectedText());
}
