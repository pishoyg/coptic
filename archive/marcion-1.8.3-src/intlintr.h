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

#ifndef INTLINTR_H
#define INTLINTR_H

#include <QWidget>
#include <QMenu>
#include <QAction>
#include <QTableWidgetItem>
#include <QClipboard>

#include "translitem.h"
#include "messages.h"
#include "settings.h"
#include "cmysql.h"
#include "ctranslit.h"

namespace Ui {
    class CIntLinTr;
}

class CIntLinTr : public QWidget {
    Q_OBJECT
    friend class CTranslat;
public:
    enum Transl{English,Czech};
    CIntLinTr(CMessages * const messages,bool is_new,QWidget *parent = 0);
    ~CIntLinTr();

    void setFonts(QFont coptic,QFont latin);
    QString asString() const;
    QString asHtml(Transl,QString &,QString &,bool,QString * simptr=0,QString * simpc=0) const;
    void setPrep(QString const &);
    void setFinal(QString const &);
    void setRaw(QString const &);
    void setApp(QString const &);
    void initTbl(int);
    void finalizeTbl();
    QTableWidgetItem * setTbl(int,QString const &,QString const &,QString const &,bool,int extend=1);

    bool tblIsInit() const {return table_is_init;}
    void adjustOne(int);
    QString getFinal(Transl) const;
protected:
    void changeEvent(QEvent *e);
    void keyPressEvent(QKeyEvent * event);
private:
    Ui::CIntLinTr *ui;
    CMessages * const messages;

    QFont cop,lat;
    bool table_is_init;
    QAction * _keyb_menu;
    MButtonMenu popup;
    QMenu ppblock;
    QAction * a_mark_gr,* a_qmark,* a_extword,* a_rmextword,* a_clean,* a_convert,*a_clean_one,* a_crum,* a_dropcol,* a_inscola, *a_inscolb,* a_copy,*a_cpcnv,*a_paste,*a_cpbl,*a_ctbl,*a_psbl,*a_psbla,*a_rmbl,*a_printbl;

    static QString tmpl1,tmpl2;

    void recalcColumns();
    QString createTarget(bool,QString const &) const;
    QString cleanId(QString const &) const;
private slots:
    void on_btAction_clicked(bool checked);
    void on_tblInter_itemChanged(QTableWidgetItem* item);
    void on_txtAppend_textChanged();
    void on_txtFinal_textChanged();
    void on_txtRaw_textChanged();
    void on_txtPrep_textChanged(QString );
    void on_btNAP_clicked();
    void on_btA3_clicked();
    void on_btA2_clicked();
    void on_btA1_clicked();
    void on_btP_clicked();
    void on_btCopTag_clicked();
    void on_btGkTag_clicked();
    void on_btIdTag_clicked();
    void on_btCrLink_clicked();
    void on_btCnvText_clicked();
    void on_cbHHeader_toggled(bool checked);
    void on_btAdjust_clicked();
    void on_btRmNewlines_clicked();
    void on_tblInter_customContextMenuRequested(QPoint pos);
    void on_btReadDb_clicked();
    void on_btCreate_clicked();
    void slot_refreshRequested(CTranslItem::Lang,int,bool);
    void slot_wordChanged(CTranslItem::Lang,int,int,bool);
signals:
    void dictionaryRequested(short,int,QString);
    void grammarRequested(QString);
    void clipboardData(QStringList*,bool);
    void changed();
};

#endif // INTLINTR_H
