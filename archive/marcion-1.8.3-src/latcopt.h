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

#ifndef LATCOPT_H
#define LATCOPT_H
//
#include <QWidget>
#include <QMenu>
#include <QClipboard>
#include <QCompleter>
#include <QMessageBox>
#include <QWidgetAction>
#include <QKeyEvent>
#include <QLineEdit>

#include "settings.h"
#include "ctranslit.h"
#include "marckeyb.h"
#include "regexpbuilder.h"

//

namespace Ui{
    class frmLatCopt;
}

class CLatCopt : public QWidget
{
Q_OBJECT
public:
        enum InputType{Latin,Unicode};

        CLatCopt( QWidget * parent = 0);
        ~CLatCopt();

        void setMaxInputChars(int value);
        QString text() const;
        QString text_utf8() const;
        //QString specText() const;
        void setText(QString const &);
        void setScript(CTranslit::Script,bool cmb=true);
        short script_int() const;
        //CTranslit::Script script_scr() const;
        //QFont font() const;
        //void setLFont(QFont const &);
        void refreshFonts();
        void setSwitch(bool visible);
        void setSwitchState(bool state);
        bool rmNonWordChars() const;
        void setRmNonWordChars(bool);
        CTranslit::Tr Tr() const;
        void setTr(CTranslit::Tr tr);
        bool strip() const;
        void setStrip(bool strip);
        //bool rmSpc() const;
        CTranslit::SpaceMode spcMode() const;
        //void setRmSpc(bool rm_spc);
        void setSpcMode(CTranslit::SpaceMode space_mode);
        void setVAsPreferred();
        void allowChangeScript(),
            allowChangeScript(bool);
        void setNumeric(bool numeric) {_numeric=numeric;}

        CTranslit::Script getScript() const{return script;}

        QString updateL(bool strip,CTranslit::SpaceMode space_mode);
        QString updateL_na(bool strip,CTranslit::SpaceMode space_mode) const;

        void updateHistory();
        static void updateHistory(QComboBox * comboBox,bool top=true);
        void showKeyboard(bool);
        void showRegExp(bool);

        void copyText() const;
        void hideRegExpButton();
        void activate();
private slots:
        void on_cmbChooseScript_currentIndexChanged(int index);
        void on_tbReg_clicked();
        void on_tbKeyb_clicked();
        void on_cbTranslit_toggled(bool checked);
        //void on_cmbLatin_activated(QString );
        void on_cmbLatin_editTextChanged(QString );
        void on_lblCoptic_customContextMenuRequested(QPoint pos);

        void slot_keyb_aboutToShow();
        void slot_keyb_aboutToHide();
        void slot_reg_aboutToShow();
        void slot_reg_aboutToHide();
        void on_btActionFT_clicked(bool checked);

private:
        Ui::frmLatCopt * ui;
        QActionGroup agrp;
	CTranslit::Script script;
        CTranslit::Tr _tr;
        MButtonMenu popupFT;
        QMenu keyb,reg,scrmnu;
        QAction * copy,*clear,*rm_nw,*upd,*upd_st,*clr_hist,*scr_l,*scr_g,*scr_c,*scr_h;
        bool rmnw,_strip;
        CTranslit::SpaceMode _spc_mode;
        QWidgetAction wkeyb,wreg;

        //QFont orig_lfont;
        //QFont _font;

        CMarcKeyb * mk;
        MRegExpBuilder * rb;
        bool _numeric;
        QPixmap _lblpix;
protected:
        void keyPressEvent ( QKeyEvent * event );
signals:
        void query();
        void textChanged(QString const &);
};
#endif
