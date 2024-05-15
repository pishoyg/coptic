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

#ifndef WORDPREVIEW_H
#define WORDPREVIEW_H
//
#include <QWidget>
#include <QList>
#include <QTreeWidgetItem>
#include <QAction>
#include <QMenu>
#include <QButtonGroup>

#include "addword.h"
#include "messages.h"
#include "settings.h"
#include "ctranslit.h"
#include "cwordtemplate.h"
#include "reorder.h"
#include "worditem.h"
#include "crumwidget.h"
#include "cmysql.h"
#include "crumresulttree.h"
#include "booktextbrowser.h"
#include "lsj.h"
#include "libsearchbase.h"
#include "libbase.h"
#include "mcmbboxresult.h"
#include "mwindowswidget.h"

//

class CWTStore{
public:
    CWTStore();
    ~CWTStore(){}

    QString init_line,init_line_d,last_line;
    QList<QString> h_line,h_line_d;
    QList<CWordTemplate> _wt,_wt_d;
    int count,count_d;

    void appendItemW(QString const &, CWordTemplate const &);
    void appendItemD(QString const &, CWordTemplate const &);
    void clear();
};

class CWTStoreTbr
{
public:
    CWTStoreTbr();
    ~CWTStoreTbr(){}

    void clear();

    CWordTemplate _wt;
    CWordTemplate::Mode _mode;
    QStringList c_lines;
    QStringList combs;
};

class CWTStoreTbr2
{
public:
    CWTStoreTbr2();
    ~CWTStoreTbr2(){}

    void clear();
    void appendItem(CWordTemplate const & wt,CWordTemplate::Mode mode, QString const & line);

    QList<CWordTemplate> _wt;
    QList<CWordTemplate::Mode> _mode;
    QStringList _lines;
    int count;
};

namespace Ui {
    class frmWordPreview;
}

class CWordPreview : public QWidget
{
Q_OBJECT
public:
    enum Pg{Search,Printed,DictGk};
	CWordPreview( CMessages * const messages,
    QWidget * parent = 0);
        ~CWordPreview();

        void queryCoptic(QString const & word);
        void queryId(short,int);

        CCrumResultTree * resultTree() const;
        //CLatCopt * inputCoptic(){return ui->inpWord;}

        //void prepareCreateIndex();
        static QDate latestUpdate();
        void showPage(Pg current_page);
private slots:
        //void on_rbDirect_toggled(bool checked);
        //void on_rbIndex_toggled(bool checked);
        void on_rbCrumPg_clicked();
        void on_rbDate_clicked();
        void on_rbIdSearch_clicked();
        void on_btInvert_clicked();
        void on_txtQuot_anchorClicked(QUrl );
        void on_btHideQuot_clicked();
        void on_btAllInTree_clicked();
        void on_btTop_clicked();
        void on_btDown_clicked();
        void on_btBottom_clicked();
        void on_btUp_clicked();
        void on_btShow_clicked();
        void on_cmbChilds_currentIndexChanged(int index);
        void slot_tbrTwo_anchorClicked(QUrl );
        void slot_tbrOne_anchorClicked(QUrl );
        void on_treeResult_customContextMenuRequested(QPoint pos);
        void on_treeResult_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* previous);

        void on_btTreeD_clicked();
        void on_btTreeW_clicked();
        void on_tbPreview_currentChanged(int index);
        void on_trGreek_query();
        void on_inpWord_query();
        void on_btFullD_clicked();
        void on_btFullW_clicked();
        void on_btUncheckAll_clicked();
	void on_btCheckAll_clicked();
	void on_cmbCrum_activated(int index);
	void on_btPrev_clicked();
	void on_btNext_clicked();
	void on_txtCzEn_returnPressed();
	void on_cmbW_activated(int index);
	void on_cmbD_activated(int index);
	void on_btWord_clicked();
	void on_btDeriv_clicked();
        void slot_brPreview_anchorClicked(QUrl);
	void on_btQuery_clicked();

        void settings_fontChanged(CTranslit::Script, QFont);


        void on_brPreview_contentChanged(bool,bool,bool*);
        void on_tbrOne_contentChanged(bool,bool,bool*);
        void on_tbrTwo_contentChanged(bool,bool,bool*);
        void on_brPreview_dictionaryRequested(int,QString const &);
        void on_tbrOne_dictionaryRequested(int,QString const &);
        void on_tbrTwo_dictionaryRequested(int,QString const &);
        void on_btAction2_clicked(bool checked);
        void on_btAutoHL_clicked(bool checked);
        void on_btGoToW_clicked();
        void on_btGoToD_clicked();
        void on_btWPrev_clicked();
        void on_btWNext_clicked();
        void on_btDPrev_clicked();
        void on_btDNext_clicked();
        void slot_bgr_clicked(int id);
private:
        Ui::frmWordPreview * ui;
        CMessages * const messages;

        CCrumWidget * _crumw;
        CCrumWidget * crumw();
        CLSJ * _gkdict;
        CLSJ * gkdict();
        int crumw_index,gkdict_index;
        QButtonGroup bgr;
	void showfull(QString),
		reorder(QString),afterquery(),beforequery(),
                query(QString const & where,short table=-1);

        void startQuery();

	QList<CWordItem> words,derivs;
        static unsigned int count;

	void checkalld(bool);
        int dialects() const;
        QString dialectsAsStr() const;
        void clearTree();
        void resolveLine(CResultItem * ri);
        QString copyAsRegexp(CResultItem * ri) const;

        void printInfo();
        void showDictionary(int,QString const &);

        MButtonMenu popup;
        QAction * a_exp,* a_coll,/**a_wrap,*/* clr,* show_panel,*resolve,*a_srchregexp,*a_cpregexp,*a_labels;

        CWTStore _store;
        CWTStoreTbr _store_tbr;
        CWTStoreTbr2 _store_tbr2;

        void displayStore();
        void displayStoreTbr();
        void displayStoreTbr2();

        RtfTextDelegate cmbw_delegate,
                        cmbd_delegate,
                        treeres_delegate,
                        childs_delegate;
//signals:
        //void copticBookRequested(int,int,int);
        //void searchInLibrary(QString);
protected:
        void keyPressEvent(QKeyEvent * event);
};
#endif
