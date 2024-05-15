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

#ifndef MVERSEDBOOK_H
#define MVERSEDBOOK_H

#include <QMainWindow>
#include <QScrollBar>

#include "mdocumentbase.h"
#include "messages.h"
#include "settings.h"
#include "ctranslit.h"
#include "textbrowserext.h"
#include "msimulitem.h"
#include "libbase.h"
#include "mvbooksbw.h"
#include "mwindowswidget.h"

/*class BookRow
{
public:
    BookRow(QString const & verse,
            QString const & text,
            QString const & note):_verse(verse),_text(text),_note(note){}
    ~BookRow(){}
    QString const _verse,_text,_note;
};*/

class CSimulTreeItem : public QTreeWidgetItem
{
public:
    CSimulTreeItem(bool is_book,QString const & title,int id,int text_format,int script);

    bool _is_book;
    QString _title;
    int _id,_text_format,_script;
};

typedef QList<MTextLineItem> BookStore;

namespace Ui {
class MVersedBook;
}

class MVersedBook : public QMainWindow, public MDocumentBase
{
    Q_OBJECT
    Q_DISABLE_COPY(MVersedBook)
public:
    enum Script{
                Latin=1,Greek=2,Coptic=3,Hebrew=4
};
    enum Mode{Book,Chapter};
    enum TextFormat{Native=1,Beta=2,LatTr=3};

    explicit MVersedBook(QString const & name,
                         Script script,
                         TextFormat textFormat,
                         int key,
                         QString const & show_text=QString(),
                         QWidget *parent= 0);
    ~MVersedBook();

    void showBook(int book,int chapter);
    void findVerse(int chapter, int verse);
    void findChapter(int chapter, int verse=-1);
    void cursorOnTop();

private slots:
    void on_btCopyExt2_clicked();
    void on_btCopyExt_clicked();
    void on_btShow_clicked();
    void on_mspVerse_valueChanged(int value,int invoker);
    void on_mspChapter_valueChanged(int value,int invoker);
    void on_brBook_contentChanged(bool, bool, bool*);
    void on_tbSimulAdd_clicked(bool checked);
    void on_tbSimulRefreshLib_clicked();
    void on_tbSimulHide_clicked();
    void on_tbSimulToList_clicked();
    void slot_simulAction(int);
    void on_tbSimulUp_clicked();
    void on_tbSimulDown_clicked();
    void on_tbrSimulText_customContextMenuRequested(const QPoint & );
    void on_tbSimulAction_clicked(bool checked);
    void on_tbSimulPrev_clicked();
    void on_tbSimulNext_clicked();
    void on_treeSimulLibrary_customContextMenuRequested(const QPoint &);
    void on_tblSimulTexts_customContextMenuRequested(const QPoint &);
    void on_actionClose_triggered();
    void on_actionChapter_by_chapter_triggered();
    void on_actionEntire_book_triggered();
    void on_actionSimultaneous_reader_triggered(bool checked);
    void on_actionFind_triggered();
    void on_actionSave_as_triggered();
    void on_actionShow_table_triggered();
    void on_actionGr_Lat_dictionary_triggered();
    void on_actionCoptic_dictionary_triggered();
    void slot_activateSR();
    void on_actionT_oolbar_triggered(bool checked);
    void slot_mnuV();
    void slot_bookMode();
    void on_actionNumeric_convertor_triggered();
    void on_action_Hebrew_dictionary_triggered();
    void on_actionConcordance_triggered();
    void on_actionHyperlinks_to_concordance_triggered();
    void slot_outputAnchorClicked(QUrl url);
private:
    Ui::MVersedBook *ui;
    MVBookSbW _sbw;
    QActionGroup agr;

    int key;
    Mode mode;
    Script script;
    TextFormat textFormat;

    BookStore store;

    MButtonMenu popupSimul;
    QAction *a_prev,*a_next,*a_lead,*a_wrap,*a_dict, *a_crum,*a_lsj,*a_heb,*a_searchlib,*a_num,*a_copy,*a_copyall,*a_decf,*a_incf,*a_normf;

    QMenu popupSimulC,popupSimulL;
    QAction *ac_move,*ac_refresh,*al_remove,*al_rmall;
    QAction *ta_simul,*ta_entire;

    int _font_offset;
    bool _is_wlc;

    QMap<int,unsigned int> _ch_min_verse,_ch_max_verse;
    int _chapter_old_value,_verse_old_value;

    void displayStore();
    QString get_query(int, int) const;
    bool read_chapters(int book);
    void convertTextItem(MTextLineItem & text_item,TextFormat text_format,Script script);
    bool isSimulActivated() const;
    void refresh_simul();
    void setSimulHeaderLabels();
protected:
    void keyPressEvent(QKeyEvent * event);
};

#endif // MVERSEDBOOK_H
