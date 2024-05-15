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

#ifndef TRANSLAT_H
#define TRANSLAT_H

#include <QWidget>
#include <QFile>
#include <QFileDialog>
//#include <QMdiSubWindow>

#include "messages.h"
#include "settings.h"
#include "intlintr.h"
#include "progressdialog.h"
#include "wordpreview.h"
#include "lsj.h"
#include "grammar.h"
#include "exporttr.h"

namespace Ui {
    class CTranslat;
}

class CTranslat : public QWidget {
    Q_OBJECT
public:
    CTranslat(CMessages * const messages,QString const & filename,bool verbose=false,QWidget *parent = 0);
    ~CTranslat();

protected:
    void changeEvent(QEvent *e);
    void closeEvent ( QCloseEvent * );
    void keyPressEvent(QKeyEvent * event);
private:
    Ui::CTranslat *ui;

    CMessages * const messages;
    QString filename;
    int cut_id;
    //QMdiSubWindow wcoptdic,wgdic,wgramm;
    CWordPreview * coptdic;
    CLSJ * gdic;
    CGrammar * gramm;

    QStringList clipb;

    CExportTr ed;
    static QString tmpl1,tmpl1_simple,
        tmpl2,
        /*tmpl_header1,tmpl_header2,*/
        tmpl_inf_cz,tmpl_inf_en;

    bool changed;

    bool loadILTFile(bool);
    void saveILTFile();
    CIntLinTr * newItem() const;
    CIntLinTr * appendItem();
    bool clearInter();
    int removeCurrentItem();
    void removeToEnd();
    void stornoCut();

    void resolveTags(QString & text,bool) const;

    void fileSaved();
    void watchItem(CIntLinTr *);
private slots:
    void on_txtEntireText_textChanged();
    void on_txtAbout_textChanged();
    void on_txtTitle_textChanged(QString );
    void on_btDelSep_clicked();
    void on_btComplTr_clicked();
    void on_btExport_clicked();
    void on_btCut_clicked(bool checked);
    void on_btSplitText_clicked();
    void on_btPasteAfter_clicked();
    void on_btInsert_clicked();
    void on_btPaste_clicked();
    void on_btDel_clicked();
    void on_btLast_clicked();
    void on_btNext_clicked();
    void on_btPrev_clicked();
    void on_btFirst_clicked();
    void on_cmbItems_currentIndexChanged(int index);
    void on_btSaveAs_clicked();
    void on_btSave_clicked();
    void on_btAppend_clicked();
    void slot_dictionaryRequested(short,int,QString);
    void slot_grammarRequested(QString);
    void slot_fontChanged(CTranslit::Script, QFont);
    void slot_clipboardData(QStringList*,bool);
    void slot_fileChanged();
};

#endif // TRANSLAT_H
