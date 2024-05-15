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

#ifndef ADDWORD_H
#define ADDWORD_H
//
#include <QWidget>
#include <QPair>

#include "ctranslit.h"
#include "messages.h"
#include "settings.h"
#include "cmysql.h"
#include "dialects3.h"

//

class MainWnd;

namespace Ui {
    class frmAddWord;
}

class CAddWord : public QWidget
{
Q_OBJECT
public:
	enum Mode{
		InsertWord,UpdateWord,
		InsertDeriv,UpdateDeriv
	};

	CAddWord( CMessages * const messages,
    /*QComboBox *const* crum,*/
	int key,
        Mode mode);
	~CAddWord();
        //int type() const {return MWnd::Type;}
private slots:
        void on_btTemplPrep_clicked();
        void on_btTemplAdvb_clicked();
        void on_btTemplRefl_clicked();
 void on_btTemplIntr_clicked();
 void on_btTemplIntrQ_clicked();
 void on_btTemplTr_clicked();
 void on_btEdit_clicked();
	void on_cbUpdQual_stateChanged(int );
	void on_cbUpdCrum_stateChanged(int );
	void on_cbUpdCopt_stateChanged(int );
	void on_cbUpdCz_stateChanged(int );
	void on_cbUpdEn_stateChanged(int );
	void on_cbUpdGr_stateChanged(int );
	void on_cbUpdType_stateChanged(int );
        void on_cbDrvKey_stateChanged(int );
	void on_btAWsave_clicked();
    //void on_btAWgetcrum_clicked();
	void on_txtAWgr_textChanged(QString );
	void on_txtAWcopt_textChanged(QString );

        void ddialog_finished(int);
private:
        Ui::frmAddWord *ui;
	CMessages * const messages;
    //QComboBox *const* crum;
	const int _key;
	const Mode _mode;

	CDialects3 dd;
        //QMdiSubWindow dmdiw;

	bool is_dd_active;

        static unsigned int count;

	int addword();
	void updateword(),
		readword(),readderiv(),
		updatederiv(),addderiv();

	void clear_fields();
};
#endif
