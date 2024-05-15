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

#include "translbook.h"

CTranslBook::CTranslBook(QString const & filename,
                         CBookTextBrowser::Script script,
                         QString const & show_text,
                        QWidget * parent)
    :CHtmlReader(QFileInfo(filename).fileName(),filename,script,show_text,parent),
    gramm(0)
{
    browser()->browser()->setOpenExternalLinks(false);
    browser()->browser()->setOpenLinks(false);
    CHtmlReader::disableCharset();

    disconnect(browser()->browser(),SIGNAL(anchorClicked(QUrl)),this,SLOT(slot_anchorClicked(QUrl)));
    connect(browser()->browser(),SIGNAL(anchorClicked(QUrl)),this,SLOT(slot_anchorClicked(QUrl)));

    adjustSize();
}

CTranslBook::~CTranslBook()
{
    if(gramm)
        delete gramm;
}

void CTranslBook::slot_anchorClicked(QUrl url)
{
    QString id(url.toString());
    //messages->MsgMsg(id);
    if(id.indexOf("#")!=-1)
    {
        //id.remove(QRegExp("^.*#"));
        browser()->browser()->setSource(url);
    }
    else
    {
        QRegExp r("[1-4]\\-.+$");
        r.setMinimal(true);

        if(r.indexIn(id)!=-1)
            id=r.cap(0);
        else
        {
            //messages->MsgErr("malformed id");
            browser()->browser()->setSource(url);
            return;
        }

        short table(QString(id[0]).toShort());
        id.remove(0,2);
        int iid(id.toInt());

        //messages->MsgMsg(id+", "+QString::number(table)+", "+QString::number(iid));
        if(table==1||table==2)
        {
            browser()->copDict()->queryId(table,iid);
            browser()->header()->setDocMode(MDocHeader::CopDict);
            browser()->copDict()->showPage(CWordPreview::Search);
        }
        else if(table==3)
        {
            if(!gramm)
            {
                gramm=new CGrammar();
                browser()->header()->initPage(MDocHeader::CopGram,browser()->header()->stWdg()->addWidget(gramm));
            }

            gramm->scrollToParagraph(id);
            browser()->header()->setDocMode(MDocHeader::CopGram);
        }
        else if(table==4)
        {
            browser()->gkDict()->directSearch(id);
            browser()->header()->setDocMode(MDocHeader::GkDict);
        }
    }
}
