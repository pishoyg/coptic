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

#include "textbrowserext.h"
#include "ui_booktextbrowser.h"

CTextBrowserExt::CTextBrowserExt(QWidget *parent)
    :CBookTextBrowser(parent),
      preview(0),
      lsj_preview(0),
      copnum_preview(0),
      heb_preview(0)
{
}

CTextBrowserExt::~CTextBrowserExt()
{
    if(preview)
        delete preview;
    if(lsj_preview)
        delete lsj_preview;
    if(copnum_preview)
        delete copnum_preview;
    if(heb_preview)
        delete heb_preview;
}

//

MDocHeader * CTextBrowserExt::header()
{
    return ui->wdgDictHeader;
}

void CTextBrowserExt::find_greek_word(QString const & word)
{
        QString w(word);
        CTranslit::Script const lang=CTranslit::identify(w);
        switch(lang)
        {
        case CTranslit::Copt :
            w=CTranslit::tr(w,CTranslit::CopticNToGreekTr,true,CTranslit::RemoveAll);
            break;
        case CTranslit::Greek :
             w=CTranslit::tr(w,CTranslit::GreekNToGreekTr,true,CTranslit::RemoveAll);
            break;
        case CTranslit::Latin :
             w=CTranslit::tr(w,CTranslit::LatinNToLatinTr,true,CTranslit::RemoveAll);
            break;
        }

        bool const greek=!(lang==CTranslit::Latin);
        gkDict()->prepareParse(w,greek);
        lsj_preview->parse(greek);

        ui->wdgDictHeader->setDocMode(MDocHeader::GkDict);
}

void CTextBrowserExt::find_word(QString const & word)
{
    copDict()->queryCoptic(CTranslit::tr(word,CTranslit::CopticNToCopticTr,true,CTranslit::RemoveAll));
    ui->wdgDictHeader->setDocMode(MDocHeader::CopDict);
}

void CTextBrowserExt::find_hebrew_word(QString const & word)
{
    hebDict()->queryHebWord(CTranslit::tr(word,CTranslit::HebrewNToHebrewTr,true,CTranslit::TrimAndKeepOne));
    ui->wdgDictHeader->setDocMode(MDocHeader::HebDict);
}

void CTextBrowserExt::convert_number(QString const & number)
{
    copNum()->convertNumber(number);
    ui->wdgDictHeader->setDocMode(MDocHeader::NumConv);
}

void CTextBrowserExt::init(QString const & title,
        Script script,
        bool change_font
        )
{
    CBookTextBrowser::init(title, script,change_font);
}

CWordPreview * CTextBrowserExt::copDict()
{
    if(!preview)
    {
        preview=new CWordPreview(m_msg());
        ui->wdgDictHeader->initPage(MDocHeader::CopDict,ui->stwContent->addWidget(preview));
    }

    return preview;
}

CLSJ * CTextBrowserExt::gkDict()
{
    if(!lsj_preview)
    {
        lsj_preview=new CLSJ(m_msg());
        ui->wdgDictHeader->initPage(MDocHeader::GkDict,ui->stwContent->addWidget(lsj_preview));
    }

    return lsj_preview;
}

MCopticNumerals * CTextBrowserExt::copNum()
{
    if(!copnum_preview)
    {
        copnum_preview=new MCopticNumerals(0,true);
        ui->wdgDictHeader->initPage(MDocHeader::NumConv,ui->stwContent->addWidget(copnum_preview));
    }

    return copnum_preview;
}

MHebrDict * CTextBrowserExt::hebDict()
{
    if(!heb_preview)
    {
        heb_preview=new MHebrDict();
        ui->wdgDictHeader->initPage(MDocHeader::HebDict,ui->stwContent->addWidget(heb_preview));
    }

    return heb_preview;
}
