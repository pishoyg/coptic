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

#include "latcopt.h"
#include "ui_latcopt.h"
//
CLatCopt::CLatCopt( QWidget * parent)
        : QWidget(parent),
          ui(new Ui::frmLatCopt),
          agrp(this),
        script(CTranslit::Copt),
        _tr(CTranslit::CopticTrToCopticN),
        popupFT(),
        keyb(tr("&keyboard")),
          reg(tr("r&egexp")),
          scrmnu(tr("ch&ange script")),
          rmnw(false),
          _strip(false),
          _spc_mode(CTranslit::RemoveNone),
          wkeyb(0),wreg(0),mk(0),rb(0),
          _numeric(false)
{
        ui->setupUi(this);

        if(m_sett())
            ui->cbTranslit->setChecked(!m_sett()->unicodeInput());
        else
            ui->cbTranslit->setChecked(true);
        on_cbTranslit_toggled(ui->cbTranslit->isChecked());

        ui->cmbChooseScript->addItem(tr("latin"),CTranslit::Latin);
        ui->cmbChooseScript->addItem(tr("greek"),CTranslit::Greek);
        ui->cmbChooseScript->addItem(tr("coptic"),CTranslit::Copt);
        ui->cmbChooseScript->addItem(tr("hebrew"),CTranslit::Hebrew);
        ui->cmbChooseScript->hide();

        /*completer->setCaseSensitivity(Qt::CaseSensitive);
        completer->setModelSorting(QCompleter::CaseSensitivelySortedModel);

        cmbLatin->setCompleter(completer);
        cmbLatin->setDuplicatesEnabled(true);*/

        ui->cmbLatin->completer()->setCaseSensitivity(Qt::CaseSensitive);
        ui->cmbLatin->completer()->setCompletionMode(QCompleter::PopupCompletion);



        //setLFont(cmbLatin->font());
        //wkeyb.setDefaultWidget(&c_keyb);
        //keyb.addAction(&wkeyb);

        connect(&keyb,SIGNAL(aboutToShow()),this,SLOT(slot_keyb_aboutToShow()));
        connect(&keyb,SIGNAL(aboutToHide()),this,SLOT(slot_keyb_aboutToHide()));
        connect(&reg,SIGNAL(aboutToShow()),this,SLOT(slot_reg_aboutToShow()));
        connect(&reg,SIGNAL(aboutToHide()),this,SLOT(slot_reg_aboutToHide()));

        (scr_l=scrmnu.addAction(tr("&latin")))->setCheckable(true);
        (scr_g=scrmnu.addAction(tr("&greek")))->setCheckable(true);
        (scr_c=scrmnu.addAction(tr("&coptic")))->setCheckable(true);
        //scr_c->setChecked(true);
        (scr_h=scrmnu.addAction(tr("&hebrew")))->setCheckable(true);
        scrmnu.setEnabled(false);

        agrp.setExclusive(true);
        agrp.addAction(scr_l);
        agrp.addAction(scr_g);
        agrp.addAction(scr_c);
        agrp.addAction(scr_h);

        copy=popupFT.addAction(QIcon(":/new/icons/icons/copy.png"),tr("&copy"));
        clear=popupFT.addAction(tr("c&lear"));
        popupFT.addSeparator();
        rm_nw=popupFT.addAction(tr("&remove non-word chars"));
        upd=popupFT.addAction(tr("&update"));
        upd_st=popupFT.addAction(tr("u&pdate+strip"));
        popupFT.addSeparator();
        popupFT.addMenu(&scrmnu);
        popupFT.addSeparator();
        popupFT.addMenu(&keyb)->setIcon(QIcon(":/new/icons/icons/vkeyb.png"));
        popupFT.addMenu(&reg)->setIcon(QIcon(":/new/icons/icons/regexp.png"));
        popupFT.addSeparator();
        clr_hist=popupFT.addAction(tr("clear history"));
}

CLatCopt::~CLatCopt()
{
    if(mk)
        delete mk;
    if(rb)
        delete rb;
    delete ui;
}

//

QString CLatCopt::text_utf8() const
{return ui->lblCoptic->text();}

/*CLatCopt::CLatCopt(CTranslit::Script script,
                   QFont const & font,
                   bool tr_is_visible,
                    CTranslit::Tr tr,
                    bool rmnw,
                    bool strip,
                    bool rm_spc,
		QWidget * parent, Qt::WFlags f)
: QWidget(parent, f),script(script),_tr(tr),
        popup(),rmnw(rmnw),_strip(strip),_rm_spc(rm_spc)
{
	setupUi(this);



        cmbLatin->completer()->setCaseSensitivity(Qt::CaseSensitive);
        //completer->setModelSorting (QCompleter::CaseSensitivelySortedModel);



        cbTranslit->setChecked(true);
        cbTranslit->setVisible(tr_is_visible);
        setFont(font);
}*/
//

void CLatCopt::setMaxInputChars(int value)
{
    ui->cmbLatin->lineEdit()->setMaxLength(value);
}

QString CLatCopt::text() const
{
        return ui->cmbLatin->currentText();
}

void CLatCopt::setText(QString const & str)
{
        ui->cmbLatin->setEditText(str);
}

void CLatCopt::setScript(CTranslit::Script script,bool cmb)
{
	CLatCopt::script=script;
    refreshFonts();
    switch(script)
    {
        case CTranslit::Copt :
        if(_numeric)
            _tr=CTranslit::CopticTrToCopticN_num;
        else
            _tr=CTranslit::CopticTrToCopticN;
        break;
        case CTranslit::Greek :
        if(_numeric)
            _tr=CTranslit::GreekTrToGreekN_num;
        else
            _tr=CTranslit::GreekTrToGreekN;
        break;
        case CTranslit::Hebrew :
        if(_numeric)
            _tr=CTranslit::HebrewTrToHebrewN_num;
        else
            _tr=CTranslit::HebrewTrToHebrewN;
        break;
        case CTranslit::Latin :
        _tr=CTranslit::LatinTrToLatinN;
        break;
    }
    if(cmb)
        ui->cmbChooseScript->setCurrentIndex(ui->cmbChooseScript->findData(script));
    on_cmbLatin_editTextChanged(ui->cmbLatin->currentText());
}

short CLatCopt::script_int() const
{
    return (short)script;
}

/*void CLatCopt::setFont(QFont const & font)
{
    lblCoptic->setFont(font);
    _font=font;
}*/

/*QFont CLatCopt::font() const
{
    return _font;
}*/

/*void CLatCopt::setLFont(QFont const & font)
{
    orig_lfont=font;
    on_cbTranslit_toggled(cbTranslit->isChecked());
}*/
void CLatCopt::setSwitch(bool visible)
{
    ui->cbTranslit->setVisible(visible);
}
void CLatCopt::setSwitchState(bool state)
{
    ui->cbTranslit->setChecked(state);
    on_cbTranslit_toggled(ui->cbTranslit->isChecked());
    //on_cmbLatin_editTextChanged(cmbLatin->currentText());
}

/*void CLatCopt::on_cmbLatin_returnPressed()
{
    emit query();
}*/
/*QString CLatCopt::specText() const
{
    switch(script)
    {
        case CTranslit::Greek :
        case CTranslit::Latin :
        case CTranslit::Hebrew :
        {
            return text_utf8();
            break;
        }
        case CTranslit::Copt :
        {
            return text();
            break;
        }
    }
    return text_utf8();
}*/

void CLatCopt::copyText() const
{
    QString st(ui->lblCoptic->selectedText());
    if(st.isEmpty())
        QApplication::clipboard()->setText(ui->lblCoptic->text());
    else
        QApplication::clipboard()->setText(st);
}

void CLatCopt::on_lblCoptic_customContextMenuRequested(QPoint )
{
    bool const has_text=!ui->lblCoptic->text().isEmpty();
    copy->setEnabled(has_text);

    switch(script)
    {
    case CTranslit::Latin :
        scr_l->setChecked(true);
        break;
    case CTranslit::Greek :
        scr_g->setChecked(true);
        break;
    case CTranslit::Copt :
        scr_c->setChecked(true);
        break;
    case CTranslit::Hebrew :
        scr_h->setChecked(true);
        break;
    }

    /*scr_l->setChecked(script==CTranslit::Latin);
    scr_g->setChecked(script==CTranslit::Greek);
    scr_c->setChecked(script==CTranslit::Copt);
    scr_h->setChecked(script==CTranslit::Hebrew);*/

    QAction * a;
    if((a=popupFT.exec()))
    {
        if(a==copy)
        {
            if(has_text)
                copyText();
        }
        else if(a==clear)
            ui->cmbLatin->setEditText(QString());
        else if(a==rm_nw)
        {
            ui->cmbLatin->setEditText(ui->cmbLatin->currentText().remove(QRegExp("[^a-zA-Z]")));

        }
        else if(a==upd)
            updateL(false,CTranslit::RemoveNone);
        else if(a==upd_st)
            updateL(true,CTranslit::RemoveNone);
        else if(a==clr_hist)
            ui->cmbLatin->clear();
        else if(a==scr_l)
        {
            setScript(CTranslit::Latin);
            //cmbChooseScript->setCurrentIndex(cmbChooseScript->findData(script));
        }
        else if(a==scr_g)
        {
            setScript(CTranslit::Greek);
            //cmbChooseScript->setCurrentIndex(cmbChooseScript->findData(script));
        }
        else if(a==scr_c)
        {
            setScript(CTranslit::Copt);
            //cmbChooseScript->setCurrentIndex(cmbChooseScript->findData(script));
        }
        else if(a==scr_h)
        {
            setScript(CTranslit::Hebrew);
            //cmbChooseScript->setCurrentIndex(cmbChooseScript->findData(script));
        }
    }
}
bool CLatCopt::rmNonWordChars() const
{
    return rmnw;
}

void CLatCopt::setRmNonWordChars(bool rm)
{
    rmnw=rm;
    on_cmbLatin_editTextChanged(text());
}

CTranslit::Tr CLatCopt::Tr() const
{
    return _tr;
}

void CLatCopt::setTr(CTranslit::Tr tr)
{
    _tr=tr;
    on_cmbLatin_editTextChanged(text());
}

bool CLatCopt::strip() const
{
    return _strip;
}

void CLatCopt::setStrip(bool strip)
{
    _strip=strip;
    on_cmbLatin_editTextChanged(text());
}

/*bool CLatCopt::rmSpc() const
{
    return (_spc_mode==CTranslit::RemoveAll);
}*/

CTranslit::SpaceMode CLatCopt::spcMode() const
{
    return _spc_mode;
}

void CLatCopt::setSpcMode(CTranslit::SpaceMode space_mode)
{
    _spc_mode=space_mode;
    on_cmbLatin_editTextChanged(text());
}

/*void CLatCopt::setRmSpc(bool rm_spc)
{
    _rm_spc=rm_spc;
    on_cmbLatin_editTextChanged(text());
}*/

QString CLatCopt::updateL_na(bool strip,CTranslit::SpaceMode space_mode) const
{
    QString s(CTranslit::tr(ui->cmbLatin->currentText(),Tr(),false,CTranslit::RemoveNone));
    switch(Tr())
    {
        case CTranslit::CopticTrToCopticN :
        s=CTranslit::tr(s,CTranslit::CopticNToCopticTr,strip,space_mode);
        break;
        case CTranslit::CopticTrToCopticN_num :
        s=CTranslit::tr(s,CTranslit::CopticNToCopticTr_num,strip,space_mode);
        break;
        case CTranslit::GreekTrToGreekN :
        s=CTranslit::tr(s,CTranslit::GreekNToGreekTr,strip,space_mode);
        break;
        case CTranslit::GreekTrToGreekN_num :
        s=CTranslit::tr(s,CTranslit::GreekNToGreekTr_num,strip,space_mode);
        break;
        case CTranslit::HebrewTrToHebrewN :
        s=CTranslit::tr(s,CTranslit::HebrewNToHebrewTr,strip,space_mode);
        break;
        case CTranslit::HebrewTrToHebrewN_num :
        s=CTranslit::tr(s,CTranslit::HebrewNToHebrewTr_num,strip,space_mode);
        break;
        case CTranslit::LatinTrToLatinN :
        s=CTranslit::tr(s,CTranslit::LatinNToLatinTr,strip,space_mode);
        break;
    }
    //setText(s);
    return s;
}

QString CLatCopt::updateL(bool strip,CTranslit::SpaceMode space_mode)
{
    QString const s(updateL_na(strip,space_mode));
    setText(s);
    return s;
}

void CLatCopt::on_cmbLatin_editTextChanged(QString str)
{
    if(ui->cbTranslit->isChecked())
        ui->lblCoptic->setText(CTranslit::tr(str,Tr(),strip(),_spc_mode));
    else
        ui->lblCoptic->setText(str);
    emit textChanged(text_utf8());
}

/*void CLatCopt::on_cmbLatin_activated(QString )
{
    emit query();
}*/

void CLatCopt::updateHistory(QComboBox * comboBox,bool top)
{
    QString const s(comboBox->currentText());

    if(!s.isEmpty())
    {
        int p;
        if((p=comboBox->findText(s,static_cast<Qt::MatchFlags>(Qt::MatchExactly|Qt::MatchCaseSensitive)))==-1)
        {
            if(top)
                comboBox->insertItem(-1,s);
            else
                comboBox->addItem(s);
        }
    }
}

void CLatCopt::updateHistory()
{
    updateHistory(ui->cmbLatin);
}

void CLatCopt::on_cbTranslit_toggled(bool checked)
{
    if(checked)
        //ui->cmbLatin->setFont(m_sett()->bFont(CTranslit::Latin));
        ui->cmbLatin->setFont(QFont());
    else
        ui->cmbLatin->setFont(m_sett()->bFont(script));
    on_cmbLatin_editTextChanged(ui->cmbLatin->currentText());
}

void CLatCopt::showKeyboard(bool in_menu)
{
    CMarcKeyb::Script sc;

    switch(script)
    {
    case CTranslit::Copt :
        sc=CMarcKeyb::Coptic;
        break;
    case CTranslit::Greek :
        sc=CMarcKeyb::Greek;
        break;
    case CTranslit::Hebrew :
        sc=CMarcKeyb::Hebrew;
        break;
    case CTranslit::Latin :
        sc=CMarcKeyb::Latin;
        break;
    /*default :
            QMessageBox(QMessageBox::Information,"tr","keyboard is available only for coptic and greek script",QMessageBox::Close,this).exec();
            return;
        break;*/
    }

    if(mk)
        delete mk;

    mk=new CMarcKeyb(sc,ui->lblCoptic->font(),ui->lblCoptic->text(),ui->cmbLatin,in_menu,_numeric);

    if(in_menu)
    {
        wkeyb.setDefaultWidget(mk);
        keyb.addAction(&wkeyb);
    }
    else
    {
        mk->setWindowFlags(Qt::Tool|Qt::Popup);
        mk->setWindowIcon(ui->tbKeyb->icon());
        mk->move(ui->tbKeyb->mapToGlobal(QPoint(0,0)));
        mk->show();
        //mk->setFocus();
        mk->activateWindow();
    }


}

void CLatCopt::slot_keyb_aboutToShow()
{
    showKeyboard(true);
}

void CLatCopt::slot_keyb_aboutToHide()
{
    if(keyb.actions().contains(&wkeyb))
        keyb.removeAction(&wkeyb);
}

void CLatCopt::slot_reg_aboutToShow()
{
    showRegExp(true);
}

void CLatCopt::slot_reg_aboutToHide()
{
    if(reg.actions().contains(&wreg))
        reg.removeAction(&wreg);
}

void CLatCopt::on_tbKeyb_clicked()
{
    showKeyboard(false);
}

void CLatCopt::showRegExp(bool in_menu)
{
    if(rb)
        delete rb;

    rb= new MRegExpBuilder(ui->cmbLatin->currentText(),ui->cmbLatin,in_menu);

    if(in_menu)
    {
        wreg.setDefaultWidget(rb);
        reg.addAction(&wreg);
    }
    else
    {
        rb->setWindowFlags(Qt::Tool|Qt::Popup);
        rb->setWindowIcon(ui->tbReg->icon());
        rb->move(ui->tbReg->mapToGlobal(QPoint(0,0)));
        rb->show();
        //rb->setFocus();
        rb->activateWindow();
    }
}

void CLatCopt::on_tbReg_clicked()
{
    showRegExp(false);
}

void CLatCopt::setVAsPreferred()
{
    ui->lblCoptic->setSizePolicy(QSizePolicy::Expanding,QSizePolicy::Preferred);
}

void CLatCopt::keyPressEvent ( QKeyEvent * event )
{
    event->ignore();
    switch(event->key())
    {
    case Qt::Key_Return :
    case Qt::Key_Enter :
        emit query();
        event->accept();
        break;
    case Qt::Key_W :
        if(event->modifiers()==(Qt::AltModifier|Qt::MetaModifier))
        {
            ui->cmbLatin->setFocus();
            event->accept();
        }
    default:
        //event->ignore();
        break;
    }
    if(!event->isAccepted())
        QWidget::keyPressEvent(event);
}

void CLatCopt::allowChangeScript()
{
    ui->cmbChooseScript->show();
    scrmnu.setEnabled(true);
}

void CLatCopt::allowChangeScript(bool allow)
{
    ui->cmbChooseScript->setVisible(allow);
    scrmnu.setEnabled(allow);
}

void CLatCopt::on_cmbChooseScript_currentIndexChanged(int index)
{
    setScript((CTranslit::Script)ui->cmbChooseScript->itemData(index).toInt(),false);
}

void CLatCopt::refreshFonts()
{
    ui->lblCoptic->setFont(m_sett()->bFont(script));
    on_cbTranslit_toggled(ui->cbTranslit->isChecked());
}

void CLatCopt::hideRegExpButton()
{
    ui->tbReg->hide();
    reg.setEnabled(false);
}

void CLatCopt::activate()
{
    ui->cmbLatin->setFocus();
}

void CLatCopt::on_btActionFT_clicked(bool checked)
{
    if(checked)
    {
        popupFT.setButton(ui->btActionFT);
        on_lblCoptic_customContextMenuRequested(QPoint());
    }
}
