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

#ifndef CRUMRESULTTREE_H
#define CRUMRESULTTREE_H

#include <QTreeWidget>
#include <QTreeWidgetItem>
#include <QEvent>
#include <QHelpEvent>
#include <QWidget>
#include <QStaticText>
#include <QApplication>
#include <QDesktopWidget>

#include "cmysql.h"
#include "messages.h"
#include "settings.h"
#include "worditem.h"
#include "progressdialog.h"
#include "ctranslit.h"

class MToolTipWidget : public QWidget
{
public:
    MToolTipWidget(QWidget * parent=0);
    ~MToolTipWidget(){}

    void setText(QString const & text);
protected:
    void paintEvent(QPaintEvent * event);
private:
    QString _text;
};

typedef QPair<int,QString> CWPair;

class CWItem
{
public :
        enum Dialect{
                Sah=1,
                SahA=2,
                SahF=4,
                Achm=8,
                AchmSub=16,
                Boh=32,
                Fay=64,
                FayB=128,
                Old=256,
                NagHamm=512
        };

enum Header{No, Tr, Intr, Other};

        CWItem(QString const & text);

        void parseText(QString const & text);
        QList<CWPair> wrds,wlist,wlist_resolved;
        QString report;
        Header header;
        bool resolved;
        unsigned char warnings;
        QString wordLine(int index) const
        {return wrds[index].second;}
        QString word(int index) const
        {return wlist[index].second;}
        int dialects(int index) const
        {return wlist[index].first;}

        int dAsInt(int index) const;
        QString dAsStr(int index) const;

        static QString dToStr(int d);
        static int strToD(QString const & str);

        bool isSplitted() const;
        bool isResolved() const;

        void stripFirstWord(QString & word),
            stripFirstList(QList<CWPair> & l),
            stripFinalList();
        //bool isCompete() const;
};

class CResultItem : public QTreeWidgetItem
{
public:
    enum Type{Wrd,Drv};
    CResultItem(QString const & text);
    virtual ~CResultItem(){}

    unsigned int key,word_key,deriv_key,subitems;
    QString word,formatted_word,en,cz,gr,crum,tooltip;
    unsigned short wtype,quality;
    Type type;
    CWItem cwitem;
    void setWord(QString const & word,bool brackets);
    QList<CWPair> const & resolveItem();
    QString extractCmbPart(QString const &, int * , int *  ) const;
    CResultItem * parentItem(CWItem::Header * h);
};

class CWordPreview;

class CCrumResultTree : public QTreeWidget
{
public:
    CCrumResultTree(QWidget * parent = 0);
    void showInTree(CWordItem const * wi,CResultItem::Type type,bool clear);

    void init(CMessages * const messages);

    CResultItem * itemByKey(unsigned int key,CResultItem::Type);
    CResultItem * childByKey(unsigned int key,CResultItem::Type,QTreeWidgetItem * item);

    static QString format(QString const &, bool greek, bool brackets=true);
    static QString trBrackets(QString const &);

    void createIndex();
    void setShowToolTips(bool show_tooltips);
    void setSearchedText(QString const & pattern)
        {_searched_text=pattern;}
    void setToolTipFont(QFont const & font);
    void hideToolTip();

    static QString convertHeaderText(QString const & header_text);
protected:
    bool event(QEvent * e);
private:
    CMessages * const messages;

    MToolTipWidget toolTip;
    CResultItem * last;
    bool _show_tooltips;
    QString _searched_text;
};


#endif // CRUMRESULTTREE_H
