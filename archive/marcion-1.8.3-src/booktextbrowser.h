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

#ifndef BOOKTEXTBROWSER_H
#define BOOKTEXTBROWSER_H

#include <QMenu>
#include <QComboBox>
#include <QColorDialog>
#include <QKeyEvent>
#include <QTime>
#include <QTextBrowser>

#include "messages.h"
#include "settings.h"
#include "libsearchbase.h"
#include "progressdialog.h"
#include "latcopt.h"

#define PRGD(MESSAGE) \
    if(!prg) \
    { \
        if(time.elapsed()>5000) \
        { \
            prg=true; \
            pd.initProgress(MESSAGE,newtd->characterCount(),true); \
            pd.show(); \
        } \
    } \
    else \
    { \
        if(pd.stopped()) \
            break; \
        pd.setProgress(tc.position(),newtd->characterCount()); \
    }

#define PRGD_RESTART(MESSAGE) \
    if(prg) \
    { \
        pd.restart(); \
        pd.setTitle(MESSAGE); \
    }

namespace Ui{
    class CBookTextBrowser;
}

class CBookTextBrowser : public QWidget {
    Q_OBJECT
    Q_DISABLE_COPY(CBookTextBrowser)
    friend class CHtmlReader;
    friend class MVersedBook;
    friend class CWordPreview;
public:
    enum Script{Latin=1,Greek=2,Coptic=3,Hebrew=4/*,Unknown=99*/};
    enum Direction{Forward,Backward};
    enum Dictionary{Crum, LSJ,HebrewD,NumConvert};

    explicit CBookTextBrowser(QWidget *parent = 0);
    ~CBookTextBrowser();
    QTextBrowser * browser();
    void init(QString const & title,
              Script script,bool change_font=true);
    bool rmAccents() const;
    bool rmSpaces() const;
    CTranslit::SpaceMode rmSpaces2() const;
    bool isHighlightChecked() const;
    void beforeReload();
    void saveAs();
    void findSelected();
    //QString origText() const;

    CLatCopt const & inputBox() const;
    CLatCopt & inputBox();

    void finalizeContent();
    void clear();

    void setPanelVisibility(bool);
    void setInfoPanelVisibility(bool);
    //void setPanelText(QString const &);
    void allowChangeScript();

    void setWordsChecked(bool);
    bool isWordsChecked() const;
    bool isRegExp() const;
    void setExact(),setRegExp();
    //QString highlightText(QString const &) const;
    void setFont(QFont const &);
    void highlightText(bool highlight);
    void copyAll() const;

    void disableDictionaries(bool lsj);
private:
    bool is_finalized;
    void setOrigText(),restoreOrigText(),deleteOrigText();

    //bool prg;
private slots:
    void on_br_forwardAvailable(bool );
    void on_br_backwardAvailable(bool );
    void on_cbAllowFont_clicked(bool);
    void on_br_sourceChanged(QUrl );
    void on_cbWrap_clicked(bool checked);
    void on_btSaveAs_clicked();
    void on_br_textChanged();
    void on_btAction_clicked(bool checked);
    void on_btFindUp_clicked();
    void on_btBottom_clicked();
    void on_cbWordsOnly_toggled(bool checked);
    void on_cmbType_currentIndexChanged(int index);
    void on_btHLText_clicked(bool checked);
    void on_cbRmSpaces_clicked(bool checked);
    void on_cbRmAccents_clicked(bool checked);
    void on_btTop_clicked();
    void on_spnFSize_valueChanged(int );
    void on_cmbF_currentFontChanged(QFont f);
    void on_btHide_clicked();
    void on_btFind_clicked();
    void on_br_customContextMenuRequested(QPoint pos);

    void slot_input_textChanged(QString const & str);
protected:
    Ui::CBookTextBrowser * ui;
    MButtonMenu popup;
    QAction *s_dict, *s_crum,*s_lsj,*s_heb,*s_numconv,*searchlib,*a_find,*copy,*copyall,*find,*inc_font,*dec_font,*show_html,*show_inf;

    bool highlight();


    //CMessages * const messages;

    QString _title;
    Script script;
    QUrl lasturl;
protected:
    //QTextCharFormat orig_charformat;
    QTextDocument * orig_text;
    virtual void find_word(QString const & word);
    virtual void find_greek_word(QString const & word);
    virtual void find_hebrew_word(QString const & word);
    virtual void convert_number(QString const & number);
    virtual void searchLibrary(QString const &);
    virtual void keyPressEvent(QKeyEvent * event);
signals:
    void contentChanged(bool, bool, bool*);
    //void highlightActivated(bool*);
    //void highlightDeactivated(bool*);
    void dictionaryRequested(int,QString const &);
    //void searchInLibrary(QString);
    void historyFBChanged(int,bool);
};

#endif // BOOKTEXTBROWSER_H
