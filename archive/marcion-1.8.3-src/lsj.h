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

#ifndef LSJ_H
#define LSJ_H

//#include <QSqlQuery>
//#include <QSqlError>

#include "ctranslit.h"
#include "messages.h"
#include "settings.h"
#include "cmysql.h"
#include "mwindowswidget.h"
#include "regexpbuilder.h"

class MDictTag
{
public:
    class MDictAttr{public: QString _key,_value;};
    MDictTag(QString const & name,QString const & source);
    ~MDictTag(){}

    QString  begin() const {return _begin;}
    QString  end() const {return _end;}
    QString  body() const {return _body;}
    QString  content() const {return _content;}

    QString value(QString const & key);
    bool hasKeyValue(QString const & key,QString const & value) const;
    bool isEmpty() const {return _empty;}

    static void updateTag(QString & source,QString const & tag,QString const & replace_by=QString());
    static void removeETag(QString & source,QString const & tag);
private:
    QString _name,_body,_begin,_end,_content;
    QList<MDictAttr> _attr;
    bool _empty;
};

typedef QPair<char,QString> WDictItem;
typedef QList<WDictItem> WDict;

class CLSJPiece{
public:
    CLSJPiece();
    CLSJPiece(bool,QString const &);
    bool is_greek;
    QString text;
};

class CLSJStore{
public:
    CLSJStore();
    void appendItem(bool,QString const &);
    void clear();
    QList<CLSJPiece> items;
    int count;
};

struct s_parses
{
    int id;
    QString m_code,word;
};

namespace Ui {
    class CLSJ;
}

class CLSJ : public QWidget {
    Q_OBJECT
    Q_DISABLE_COPY(CLSJ)
public:
    enum SearchMode{Exact,RegExp};
    explicit CLSJ(CMessages * const messages,
                  QWidget *parent = 0);
    ~CLSJ();
    void prepareParse(QString const & str,bool greek);
    void directSearch(QString const & str);
    void parse(bool greek);

    static QString prepareSense(QString const & source,bool greek);
    static QString prepareSenseItem(QString const & source);

    static void init();
private:
    Ui::CLSJ *ui;

    CMessages * const messages;
    static unsigned int count;

    QString _fulltextQuery;

    static QString perseusToUtf8(
            QString const & latin,bool greek);
    static QString utf8ToPerseus(
            QString const & utf8,bool greek);
    void dictionary(QString const & str, SearchMode mode,bool greek);
    /*static QString enclosedBy(QString const & begin,
                       QString const & end,
                       QString const & text,
                       bool outer,
                       int * from);*/

    SearchMode searchMode() const;
    QString limit() const;

    static WDict wclass,wpers,wnum,wtens,wmode,wvoice,wgender,wcase,wadjform;
    static QList<WDict*> mclist;
    static QString gwcount,lwcount;

    QString morphCode(QString const &) const;

    CLSJStore _store;

    void displayStore();
private slots:
    void on_brOutput_dictionaryRequested(int dict,QString const & word);
    void on_txtInput_query();

    /*void on_brOutput_highlightActivated(bool*);
    void on_brOutput_highlightDeactivated(bool*);*/
    void on_brOutput_contentChanged(bool, bool, bool*);
    void on_rbGreek_toggled(bool checked);
    void on_rbLatin_toggled(bool checked);

    void slot_AnchorClicked(QUrl );
    void slot_txtInput_textChanged(QString const & text);

    void settings_fontChanged(CTranslit::Script, QFont);

    void on_cmbResults_activated(int index);
    void on_btTabDict_clicked();
    void on_btTabInfl_clicked();
    void on_twInput_currentChanged(int index);
    void on_btFulltextSearch_clicked();
    void on_tbRegExpFt_clicked();
    void on_cmbFulltext_editTextChanged(const QString &arg1);
};

#endif // LSJ_H
