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

#ifndef LIBSEARCHRESULT_H
#define LIBSEARCHRESULT_H

#include "messages.h"
#include "librarywidget.h"
#include "mversedbook.h"
#include "textbrowserext.h"

namespace Ui{
    class CLibSearchResult;
}

class CLSStore{
public:
    CLSStore();
    QStringList coll,loc,text,num,id,sc,fmt,name,chapter,verse;
    QString init_line;
    int count;
    void appendItem(QString const & coll,
                        QString const & loc,
                        QString const & text,
                        QString const & num,
                        QString const & id,
                        QString const & sc,
                        QString const & fmt,
                        QString const & name,
                        QString const & chapter,
                        QString const & verse);
};

class CLibSearchResult : public QWidget
{
    Q_OBJECT
public:
    enum DataType{MySql,Html,Archive};
    CLibSearchResult(QString const & str, CMessages * const messages,CTranslit::Script script,DataType,QWidget *parent = 0);

    ~CLibSearchResult();
    void setFont(QFont font);
    /*void appendItem(QString const & coll,
                    QString const & loc,
                    QString const & text,
                    QString const & num,
                    QString const & id,
                    QString const & sc,
                    QString const & fmt,
                    QString const & name,
                    QString const & chapter,
                    QString const & verse);*/
    //void appendLine(QString const & line);
    void goToTop();

    CLSStore & getStore(){return store;}
    void displayStore();
    CBookTextBrowser & textBrowser();
    //QProcess & swishProcess(){return swish_p;}
    //void readSwishOutput();
    void append(QString const &);
private:
    Ui::CLibSearchResult * ui;
    CMessages * const messages;
    CTranslit::Script script;
    static QString form;

    CLSStore store;
    DataType data_type;

private slots:
    void w_anchorClicked(QUrl );
    //void on_widget_highlightActivated(bool * );
    //void on_widget_highlightDeactivated(bool * );
    void on_widget_contentChanged(bool, bool, bool*);
};

#endif // LIBSEARCHRESULT_H
